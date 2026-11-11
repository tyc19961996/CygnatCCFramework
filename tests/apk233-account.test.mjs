import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

function harness(isApk233 = true, version = 1) {
    const requests = [];
    const events = [];
    const timers = new Set();
    let reflectionCalls = 0;
    let now = 0;
    const modules = new Map();
    function load(file) {
        if (modules.has(file)) return modules.get(file).exports;
        const module = { exports: {} };
        modules.set(file, module);
        const source = readFileSync(file, "utf8");
        const { outputText } = ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
        });
        const require = (name) => {
            if (name.endsWith("/Core")) return { Platform: { isApk233 } };
            if (name.endsWith("/Base/BaseCommon")) return { BaseCommon: class BaseCommon {} };
            if (name === "cc") return { native: { reflection: { callStaticMethod(className, method, signature, body) {
                reflectionCalls++;
                assert.equal(className, "com/cygnat/apk233/Cygnat233AccountBridge");
                if (method === "getProtocolVersion") return version;
                if (method === "drainEvents") return JSON.stringify(events.splice(0));
                assert.equal(signature, "(Ljava/lang/String;)Z");
                requests.push(JSON.parse(body));
                return true;
            } } } };
            const resolved = path.resolve(path.dirname(file), name);
            return load(existsSync(resolved + ".ts") ? resolved + ".ts" : path.join(resolved, "index.ts"));
        };
        new Function("require", "module", "exports", "setInterval", "clearInterval", "Date", outputText)(
            require, module, module.exports,
            (callback) => { timers.add(callback); return callback; },
            (callback) => timers.delete(callback),
            { now: () => now },
        );
        return module.exports;
    }
    const { Apk233Account } = load(path.resolve("MiniGame/apk233/Apk233Account.ts"));
    const { Apk233Common } = load(path.resolve("MiniGame/apk233/Apk233Common.ts"));
    return {
        account: Apk233Account, common: new Apk233Common(), requests, timers,
        get reflectionCalls() { return reflectionCalls; },
        event(event) { events.push(event); },
        tick(ms = 100) {
            now += ms;
            for (const callback of [...timers]) callback();
        },
        async init() {
            const promise = Apk233Account.init({ appKey: "key", cpId: "cp" });
            const { requestId } = requests.at(-1);
            this.event({ requestId, type: "initialized" });
            this.tick();
            await promise;
        },
    };
}

test("233 登录在明确初始化后通过通用入口返回 uid、sid 和兼容 code", async () => {
    const h = harness();
    assert.equal((await h.common.login()).success, false);
    assert.equal(h.requests.length, 0);
    const init = h.account.init({ appKey: " key ", cpId: " cp " });
    assert.equal(h.account.init({ appKey: "key", cpId: "cp" }), init);
    await assert.rejects(h.account.init({ appKey: "other", cpId: "cp" }));
    assert.deepEqual(h.requests[0], { requestId: h.requests[0].requestId, kind: "init", appKey: "key", cpId: "cp" });
    h.event({ requestId: h.requests[0].requestId, type: "initialized" });
    h.tick();
    await init;
    const login = h.common.login();
    assert.equal(h.common.login(), login);
    h.event({ requestId: h.requests[1].requestId, type: "loggedIn", generation: 0, uid: "u", sid: "s" });
    h.tick();
    assert.deepEqual(await login, { success: true, uid: "u", sid: "s", code: "s" });
    assert.equal(h.timers.size, 0);
});

test("账号事件过滤凭证、支持取消订阅，并使同批旧登录结果失效", async () => {
    const h = harness();
    const changes = [];
    const unsubscribe = h.account.onAccountChanged((event) => changes.push(event));
    await h.init();
    const login = h.common.login();
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 0, uid: "old", sid: "old" });
    h.event({ type: "account", generation: 1, reason: "logout", uid: "old", sid: "old" });
    h.event({ type: "account", generation: 2, reason: "changed", uid: "new", sid: "new" });
    h.tick();
    assert.equal((await login).success, false);
    assert.deepEqual(changes, [{ generation: 1, reason: "logout" }, { generation: 2, reason: "changed" }]);
    unsubscribe();
    assert.equal(h.timers.size, 0);
    const switched = h.common.login();
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 2, uid: "new", sid: "new" });
    h.tick();
    assert.equal((await switched).uid, "new");
});

test("非 233 和只装广告的 APK 账号不可用时明确失败", async () => {
    const web = harness(false);
    await assert.rejects(web.account.init({ appKey: "key", cpId: "cp" }));
    assert.equal((await web.common.login()).success, false);
    assert.equal(web.reflectionCalls, 0);
    const adsOnly = harness(true, 0);
    await assert.rejects(adsOnly.account.init({ appKey: "key", cpId: "cp" }));
    assert.deepEqual(adsOnly.requests, []);
    assert.equal(adsOnly.timers.size, 0);
});

test("初始化后的订阅在没有显式登录请求时仍接收宿主事件", async () => {
    const h = harness();
    const changes = [];
    const unsubscribe = h.account.onAccountChanged((event) => changes.push(event));
    assert.equal(h.timers.size, 0);
    await h.init();
    assert.equal(h.timers.size, 1);
    h.event({ type: "account", generation: 1, reason: "logout" });
    h.tick();
    assert.deepEqual(changes, [{ generation: 1, reason: "logout" }]);
    assert.deepEqual(h.requests.map((request) => request.kind), ["init"]);
    h.event({ type: "detached", generation: 2 });
    h.tick();
    assert.deepEqual(changes, [{ generation: 1, reason: "logout" }]);
    unsubscribe();
    assert.equal(h.timers.size, 0);
});

test("无效凭证与销毁后的迟到结果不会登录成功", async () => {
    const h = harness();
    await h.init();
    const first = h.common.login();
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 0, uid: "", sid: "s" });
    h.tick();
    assert.equal((await first).success, false);
    const second = h.common.login();
    h.event({ type: "detached", generation: 1 });
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 0, uid: "u", sid: "s" });
    h.tick();
    assert.equal((await second).success, false);
    assert.equal((await h.common.login()).success, false);
    await h.init();
});

test("已登录的订阅在 Activity 销毁时收到一次退出通知，重新初始化后可登录", async () => {
    const h = harness();
    const changes = [];
    const unsubscribe = h.account.onAccountChanged((event) => changes.push(event));
    await h.init();
    const first = h.common.login();
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 0, uid: "old", sid: "old" });
    h.tick();
    assert.equal((await first).success, true);
    h.event({ type: "account", generation: 1, reason: "changed" });
    h.event({ type: "detached", generation: 2 });
    h.event({ type: "detached", generation: 3 });
    h.tick();
    assert.deepEqual(changes, [{ generation: 3, reason: "logout" }]);
    assert.equal(h.timers.size, 0);
    assert.equal((await h.common.login()).success, false);
    await h.init();
    const second = h.common.login();
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 3, uid: "new", sid: "new" });
    h.tick();
    assert.equal((await second).uid, "new");
    unsubscribe();
});

test("框架等待超时后提示关闭重开，迟到结果不会结算新请求", async () => {
    const h = harness();
    const init = h.account.init({ appKey: "key", cpId: "cp" });
    h.tick(35_000);
    await assert.rejects(init, { code: -97105, message: /关闭.*重新打开/ });
    await h.init();
    const first = h.common.login();
    const firstId = h.requests.at(-1).requestId;
    h.tick(185_000);
    const failed = await first;
    assert.equal(failed.errCode, -97105);
    assert.match(failed.errMsg, /关闭.*重新打开/);
    const retry = h.common.login();
    h.event({ requestId: firstId, type: "loggedIn", generation: 0, uid: "old", sid: "old" });
    h.event({ requestId: h.requests.at(-1).requestId, type: "loggedIn", generation: 0, uid: "new", sid: "new" });
    h.tick();
    assert.equal((await retry).uid, "new");
});
