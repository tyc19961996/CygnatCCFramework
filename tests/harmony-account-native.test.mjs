import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const base = 'native/harmonyos-next/cygnat-harmony-ads/src/main/ets/';

async function fixture(initialize = true) {
    const state = { order: [], changed: null, timers: [], fail: null, stateMismatch: false, wait: null };
    globalThis.__accountSDK = {
        gamePlayer: {
            init: async () => { state.order.push('init'); if (state.initError) throw { code: state.initError }; },
            on: (_event, cb) => { state.order.push('on'); state.changed = cb; }, off() {},
            unionLogin: async (_context, request) => {
                state.order.push(request.showLoginDialog ? 'switch' : 'login');
                if (state.wait) await state.wait;
                if (state.fail) throw { code: state.fail, message: 'sensitive-code-never-log' };
                return { accountName: 'hw_account', localPlayer: { gamePlayerId: 'p' } };
            },
            verifyLocalPlayer: async (_c, r) => { assert.equal(r.thirdOpenId, ''); state.order.push('verify'); },
            savePlayerRole: async () => { state.order.push('role'); },
        },
        authentication: {
            HuaweiIDProvider: class { createLoginWithHuaweiIDRequest() { return {}; } },
            AuthenticationController: class { async executeRequest(r) {
                state.order.push('code'); assert.equal(r.forceLogin, false);
                return { state: state.stateMismatch ? 'wrong' : r.state, data: { authorizationCode: 'fresh-once' } };
            } },
        },
        util: { generateRandomUUID: () => 'random-state' },
        setTimeout: (f) => { state.timers.push(f); return state.timers.length; }, clearTimeout() {},
    };
    const source = (await readFile(base + 'HarmonyAccountService.ets', 'utf8'))
        .replace(/import\s*\{\s*(gamePlayer|authentication|util)\s*\}\s*from\s*[^;]+;/g, 'const $1 = globalThis.__accountSDK.$1;')
        .replace(/import\s*\{\s*(common|BusinessError)\s*\}\s*from\s*[^;]+;/g, '')
        .replace(/import\s*\{[^}]+\}\s*from\s*'.\/AccountProtocol';/, 'const parseAccountRequest = JSON.parse;')
        .replace(/import\s*\{[^}]+\}\s*from\s*'.\/HarmonyAccountLifecycle';/, 'const configureHarmonyAccountLifecycle = () => {};')
        .replace(/\bsetTimeout\(/g, 'globalThis.__accountSDK.setTimeout(')
        .replace(/\bclearTimeout\(/g, 'globalThis.__accountSDK.clearTimeout(');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const { HarmonyAccountService } = await import(`data:text/javascript,${encodeURIComponent(js)}#${Math.random()}`);
    const service = new HarmonyAccountService();
    const events = [];
    const send = (s) => events.push(JSON.parse(s));
    if (initialize) await service.initialize({}, send);
    const request = (id, action = 'login', role) => service.handleRequest({}, JSON.stringify({ version: 1, requestId: id, action, role }), send);
    return { service, state, events, request };
}

test('Worker 首次请求早于页面加载成功回调时等待初始化，不误报公开配置错误', async () => {
    const { service, state, events, request } = await fixture(false);
    const pending = request('before-load-content');
    await Promise.resolve();
    assert.equal(events.length, 0, '页面加载成功前不能返回 -98007，也不能提前调用 SDK');
    assert.deepEqual(state.order, []);
    await service.initialize({});
    await pending;
    assert.equal(events.at(-1).result.success, true);
    assert.deepEqual(state.order, ['init', 'on', 'login', 'code', 'verify']);
});

test('等待首次初始化时销毁或超时解除请求所有权，不提前初始化SDK', async () => {
    for (const reason of ['dispose', 'timeout']) {
        const { service, state, events, request } = await fixture(false);
        const pending = request(reason);
        await Promise.resolve();
        if (reason === 'dispose') service.dispose();
        else state.timers.at(-1)();
        await pending;
        assert.equal(events.at(-1).result.errCode, reason === 'dispose' ? -98005 : -98004);
        assert.deepEqual(state.order, []);
        await service.initialize({});
        await request(reason + '-new');
        assert.equal(events.at(-1).result.success, true);
    }
});
test('原生初始化后注册事件；官方登录与授权码状态检查及合规通过后才成功', async () => {
    const { state, events, request } = await fixture();
    await request('1');
    assert.deepEqual(state.order, ['init', 'on', 'login', 'code', 'verify']);
    assert.deepEqual(events.at(-1).result, { success: true, code: 'fresh-once', gamePlayerId: 'p' });
    await request('2', 'switchAccount');
    assert.ok(state.order.includes('switch'));
    await request('3', 'reportRole', { gamePlayerId: 'old', roleId: '1', roleName: '旧' });
    assert.equal(events.at(-1).result.success, false);
});
test('原生取消与状态错配都返回失败，不输出SDK错误消息和凭据', async () => {
    const { state, events, request } = await fixture();
    state.fail = 1002000016;
    await request('1');
    assert.equal(events.at(-1).result.errCode, 1002000016);
    assert.doesNotMatch(JSON.stringify(events), /sensitive-code/);
    state.fail = null; state.stateMismatch = true;
    await request('2');
    assert.equal(events.at(-1).result.errCode, -98008);
    assert.ok(!state.order.includes('verify'));
});
test('原生超时保留官方操作所有权，迟到成功不交付，新请求不会叠加弹窗', async () => {
    const { state, events, request } = await fixture();
    let release;
    state.wait = new Promise((r) => { release = r; });
    const p = request('1');
    await Promise.resolve();
    state.timers.at(-1)();
    assert.equal(events.at(-1).result.errCode, -98004);
    await request('2');
    assert.equal(events.at(-1).result.errCode, -98003);
    release(); await p;
    assert.ok(!events.some((e) => e.requestId === '1' && e.result?.success));
    state.wait = null;
    await request('3');
    assert.equal(events.at(-1).result.success, true);
});
test('原生账号事件失效在途凭据且不自动弹窗；清理后不交付旧结果', async () => {
    const { service, state, events, request } = await fixture();
    let release;
    state.wait = new Promise((r) => { release = r; });
    const p = request('1'); await Promise.resolve();
    state.changed({ event: 1 });
    assert.equal(events.find((e) => e.type === 'accountChanged').generation, 1);
    release(); await p;
    assert.ok(!events.some((e) => e.result?.success));
    assert.equal(state.order.filter((o) => o === 'login').length, 1);
    service.dispose();
});

test('UI 销毁后页面重建可重新初始化并恢复账号监听', async () => {
    const { service, state, events, request } = await fixture();
    service.dispose();
    await service.initialize({});
    await request('rebuilt');
    assert.equal(events.at(-1).result.success, true);
    assert.equal(state.order.filter((o) => o === 'on').length, 2);
});

test('页面重建等待旧官方操作返回后恢复，重复请求不会重复调用SDK或提前失败', async () => {
    const { service, state, events, request } = await fixture();
    let release;
    state.wait = new Promise((r) => { release = r; });
    const p = request('same'); await Promise.resolve();
    await request('same');
    assert.equal(events.length, 0, '重复在途请求不能向原请求发Busy');
    service.dispose();
    const rebuilt = service.initialize({});
    release(); await p; await rebuilt;
    state.wait = null;
    await request('same');
    assert.equal(state.order.filter((o) => o === 'login').length, 1, '旧requestId不可重放');
    await request('new');
    assert.equal(events.at(-1).result.success, true);
});

test('初始化网络失败可由用户显式重试，合规失败仍不返回凭据', async () => {
    const { service, state, events, request } = await fixture();
    service.dispose(); state.initError = 1002000002;
    await assert.rejects(service.initialize({}));
    await request('network');
    assert.equal(events.at(-1).result.errCode, 1002000002);
    state.initError = null;
    await request('retry');
    assert.equal(events.at(-1).result.success, true);
    globalThis.__accountSDK.gamePlayer.verifyLocalPlayer = async () => { throw { code: 1002000006 }; };
    await request('minor');
    assert.equal(events.at(-1).result.success, false);
    assert.equal(events.at(-1).result.errCode, 1002000006);
    assert.equal(events.at(-1).result.code, '');
});

test('等待重建的页面再次销毁后不能复活已销毁的上下文', async () => {
    const { service, state, events, request } = await fixture();
    let release;
    state.wait = new Promise((r) => { release = r; });
    const old = request('old'); await Promise.resolve();
    service.dispose();
    const rebuilt = service.initialize({});
    service.dispose();
    const count = state.order.filter((o) => o === 'on').length;
    const rejection = assert.rejects(rebuilt);
    release(); await old; await rejection;
    assert.equal(state.order.filter((o) => o === 'on').length, count);
    state.wait = null;
    await request('after-dispose');
    assert.equal(events.at(-1).result.success, false);
});
