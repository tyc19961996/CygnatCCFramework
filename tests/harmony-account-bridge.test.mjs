import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const base = 'native/harmonyos-next/cygnat-harmony-ads/src/main/ets/';
const compile = (text) => 'data:text/javascript,' + encodeURIComponent(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);

test('纯TS账号Worker队列校验请求并仅传递字符串，排空事件只消费一次', async () => {
    const protocolURL = compile(await readFile(base + 'AccountProtocol.ts', 'utf8'));
    const { parseAccountRequest } = await import(protocolURL);
    assert.equal(parseAccountRequest('null'), null);
    assert.equal(parseAccountRequest('{"version":2}'), null);
    const request = JSON.stringify({ version: 1, requestId: '1', action: 'login' });
    assert.equal(parseAccountRequest(request).action, 'login');
    assert.equal(parseAccountRequest(JSON.stringify({ version: 1, requestId: '2', action: 'reportRole', role: { gamePlayerId: 'p', roleId: '', roleName: 'default' } })), null);
    const queue = await import(compile((await readFile(base + 'HarmonyAccountWorkerQueue.ts', 'utf8')).replace("'./AccountProtocol'", JSON.stringify(protocolURL))));
    assert.equal(queue.submitHarmonyAccountRequest(request), false);
    const sent = [];
    queue.configureHarmonyAccountWorker((s) => sent.push(s));
    assert.equal(queue.submitHarmonyAccountRequest('bad'), false);
    assert.equal(queue.submitHarmonyAccountRequest(request), true);
    assert.deepEqual(sent, [request]);
    queue.enqueueHarmonyAccountEvent(JSON.stringify({ version: 1, type: 'accountChanged', generation: 1 }));
    assert.equal(JSON.parse(queue.drainHarmonyAccountEvents())[0].generation, 1);
    assert.equal(queue.drainHarmonyAccountEvents(), '[]');
    for (let generation = 1; generation <= 100; generation++) queue.enqueueHarmonyAccountEvent(JSON.stringify({ generation }));
    const events = JSON.parse(queue.drainHarmonyAccountEvents());
    assert.equal(events.length, 64); assert.equal(events.at(-1).generation, 100);
});

test('Cocos账号反射使用独立端点，缺失桥接时返回失败而不抛出', async () => {
    const source = (await readFile('MiniGame/harmony/HarmonyAccount.ts', 'utf8'))
        .replace('import { native } from "cc";', 'const native = globalThis.__accountReflection;')
        .replace('import { Platform } from "../../Core";', 'const Platform = { isHarmonyOS: true };');
    const clientURL = compile(await readFile('MiniGame/harmony/HarmonyAccountClient.ts', 'utf8'));
    const runtime = source.replace('"./HarmonyAccountClient"', JSON.stringify(clientURL));
    const calls = [];
    globalThis.__accountReflection = { reflection: { callStaticMethod: (...args) => { calls.push(args); return null; } } };
    const { HarmonyAccount } = await import(compile(runtime));
    assert.equal((await HarmonyAccount.login()).success, false);
    assert.equal(calls[0][0], 'entry/src/main/ets/cygnat/CygnatHarmonyAccountBridge');
    assert.equal(calls[0][1], 'entry/getProtocolVersion');
    assert.equal(calls[0][3], true);
    delete globalThis.__accountReflection;
    const bridge = await readFile('native/harmonyos-next/glue/CygnatHarmonyAccountBridge.ets', 'utf8');
    assert.match(bridge, /@cygnat\/harmony-ads\/Worker/);
    assert.doesNotMatch(bridge, /@kit\.|HarmonyAccountService/);
});

test('TS UIAbility 回调先到时等待服务注册，注册后只转交一次合法上下文', async () => {
    const source = await readFile(base + 'HarmonyAccountLifecycle.ts', 'utf8');
    assert.doesNotMatch(source, /HarmonyAccountService|@kit\.|\.ets/);
    const lifecycle = await import(compile(source));
    let got;
    const context = {};
    const early = lifecycle.initializeHarmonyAccountFromAbility(context);
    await Promise.resolve();
    assert.equal(got, undefined);
    lifecycle.configureHarmonyAccountLifecycle(async (context) => { got = context; });
    await early;
    assert.equal(got, context);
    let failures = 0;
    lifecycle.configureHarmonyAccountLifecycle(() => Promise.reject(new Error('公开 ID 待配置')));
    await lifecycle.initializeHarmonyAccountFromAbility(context).catch(() => { failures++; });
    assert.equal(failures, 1, 'UIAbility 的 catch 可以消费未配置失败，不产生未处理 Promise');
});

test('TS UIAbility 服务先注册时立即初始化，失败由调用方消费', async () => {
    const lifecycle = await import(compile(await readFile(base + 'HarmonyAccountLifecycle.ts', 'utf8')) + '#registered-first');
    let got;
    lifecycle.configureHarmonyAccountLifecycle(async (context) => { got = context; });
    const context = {};
    await lifecycle.initializeHarmonyAccountFromAbility(context);
    assert.equal(got, context);
    lifecycle.configureHarmonyAccountLifecycle(async () => { throw Object.assign(new Error('初始化失败'), { code: 401 }); });
    await assert.rejects(lifecycle.initializeHarmonyAccountFromAbility(context), { code: 401 });
});

test('TS UIAbility 登记后销毁不初始化旧上下文，重建只执行新上下文', async () => {
    const lifecycle = await import(compile(await readFile(base + 'HarmonyAccountLifecycle.ts', 'utf8')) + '#destroy-before-registration');
    const old = lifecycle.initializeHarmonyAccountFromAbility({});
    const rejected = assert.rejects(old);
    lifecycle.disposeHarmonyAccountFromAbility();
    const context = {};
    const rebuilt = lifecycle.initializeHarmonyAccountFromAbility(context);
    const seen = [];
    lifecycle.configureHarmonyAccountLifecycle(async (ctx) => { seen.push(ctx); });
    await rejected; await rebuilt;
    assert.deepEqual(seen, [context]);
});

test('TS UIAbility 在途初始化被销毁时拒绝旧Promise，不复活上下文', async () => {
    const lifecycle = await import(compile(await readFile(base + 'HarmonyAccountLifecycle.ts', 'utf8')) + '#destroy-in-flight');
    let release; let disposed = 0;
    lifecycle.configureHarmonyAccountLifecycle(() => new Promise((resolve) => { release = resolve; }), () => { disposed++; });
    const pending = lifecycle.initializeHarmonyAccountFromAbility({});
    const rejected = assert.rejects(pending);
    lifecycle.disposeHarmonyAccountFromAbility();
    release(); await rejected;
    assert.equal(disposed, 1);
});

test('TS UIAbility 销毁后的旧加载回调被拒绝，新页面回调可初始化', async () => {
    const lifecycle = await import(compile(await readFile(base + 'HarmonyAccountLifecycle.ts', 'utf8')) + '#late-callback');
    const before = lifecycle.getHarmonyAccountLifecycleGeneration();
    lifecycle.disposeHarmonyAccountFromAbility();
    const seen = [];
    lifecycle.configureHarmonyAccountLifecycle(async (context) => { seen.push(context); });
    await assert.rejects(lifecycle.initializeHarmonyAccountFromAbility({}, before));
    const context = {};
    await lifecycle.initializeHarmonyAccountFromAbility(context, lifecycle.getHarmonyAccountLifecycleGeneration());
    assert.deepEqual(seen, [context]);
});
