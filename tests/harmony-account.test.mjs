import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadClient() {
    const text = await readFile('MiniGame/harmony/HarmonyAccountClient.ts', 'utf8');
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    return import(`data:text/javascript,${encodeURIComponent(js)}#${Math.random()}`);
}
async function fixture() {
    const { HarmonyAccountClient } = await loadClient();
    const state = { requests: [], events: [], ticks: [], timeouts: [], version: 1, accept: true };
    const client = new HarmonyAccountClient({
        getProtocolVersion: () => state.version,
        submit: (r) => { state.requests.push(r); return state.accept; },
        drainEvents: () => state.events.splice(0),
    }, {
        setInterval: (f) => { state.ticks.push(f); return 1; }, clearInterval() {},
        setTimeout: (f) => { state.timeouts.push(f); return state.timeouts.length; }, clearTimeout() {},
    });
    const reply = (result, request = state.requests.at(-1)) => {
        state.events.push({ version: 1, type: 'result', requestId: request.requestId, result });
        state.ticks.at(-1)();
    };
    return { client, state, reply };
}
test('鸿蒙登录单飞，不缓存一次性凭据，切换使用独立动作', async () => {
    const { client, state, reply } = await fixture();
    const a = client.login();
    assert.equal(client.login(), a);
    assert.equal(state.requests.length, 1);
    reply({ success: true, code: 'once', gamePlayerId: 'p1' });
    assert.equal((await a).gamePlayerId, 'p1');
    const b = client.login();
    assert.equal(state.requests.length, 2);
    reply({ success: false, code: '', errCode: 1002000016, errMsg: '已取消' });
    assert.equal((await b).success, false);
    const c = client.login(true);
    assert.equal(state.requests.at(-1).action, 'switchAccount');
    reply({ success: true, code: 'new', gamePlayerId: 'p2' });
    await c;
});
test('账号变化立即失效在途登录并通知所有监听器，迟到响应被丢弃', async () => {
    const { client, state, reply } = await fixture();
    let changes = 0;
    client.onAccountChanged(() => { throw Error('业务监听异常'); });
    const off = client.onAccountChanged(() => changes++);
    const p = client.login();
    const old = state.requests.at(-1);
    state.events.push({ version: 1, type: 'accountChanged', generation: 1 });
    state.ticks.at(-1)();
    assert.equal((await p).success, false);
    assert.equal(changes, 1);
    off();
    const q = client.login();
    reply({ success: true, code: 'old', gamePlayerId: 'p0' }, old);
    reply({ success: true, code: 'fresh', gamePlayerId: 'p1' });
    assert.equal((await q).code, 'fresh');
    await assert.rejects(client.reportRole({ gamePlayerId: 'p0', roleId: '1', roleName: '旧角色' }));
});
test('缺失桥接、超时和不完整成功都不会假成功', async () => {
    const { client, state, reply } = await fixture();
    state.version = null;
    assert.equal((await client.login()).success, false);
    state.version = 1;
    const p = client.login();
    state.timeouts.at(-1)();
    assert.equal((await p).errCode, -98004);
    const q = client.login();
    reply({ success: true, code: 'bad' });
    assert.equal((await q).success, false);
});
test('角色上报必须匹配当前已验证玩家并等待原生结果', async () => {
    const { client, state, reply } = await fixture();
    await assert.rejects(client.reportRole({ gamePlayerId: 'p', roleId: '1', roleName: '蚂蚁' }));
    const p = client.login(); reply({ success: true, code: 'once', gamePlayerId: 'p' }); await p;
    const role = { gamePlayerId: 'p', roleId: '1', roleName: '蚂蚁', serverId: '1' };
    const r = client.reportRole(role);
    assert.equal(state.requests.at(-1).action, 'reportRole');
    reply({ success: true, code: '' });
    await r;
});

test('旧超时回调不能终结新请求，取消与网络错误消息可区分且不泄漏凭据', async () => {
    const { client, state, reply } = await fixture();
    const first = client.login();
    const oldTimeout = state.timeouts.at(-1);
    reply({ success: false, code: 'sensitive', errCode: 1002000016, errMsg: 'sensitive' });
    assert.match((await first).errMsg, /取消/);
    const next = client.login();
    oldTimeout();
    reply({ success: false, code: 'sensitive', errCode: 1002000002, errMsg: 'sensitive' });
    const result = await next;
    assert.match(result.errMsg, /网络/);
    assert.equal(result.code, '');
    assert.doesNotMatch(result.errMsg, /sensitive/);
});

test('原生未初始化与官方配置错误提示分开，保留原始数字错误码', async () => {
    const { client, reply } = await fixture();
    const uninitialized = client.login();
    reply({ success: false, code: '', errCode: -98007 });
    assert.match((await uninitialized).errMsg, /尚未初始化/);
    const configuration = client.login();
    reply({ success: false, code: '', errCode: 401 });
    assert.match((await configuration).errMsg, /指纹与服务配置/);
});
