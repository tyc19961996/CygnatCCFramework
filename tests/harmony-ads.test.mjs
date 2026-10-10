import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();

class FakeTransport {
    constructor(version = 1) {
        this.version = version;
        this.requests = [];
        this.events = [];
        this.submitResult = true;
        this.drainError = null;
    }

    getProtocolVersion() {
        return this.version;
    }

    submit(request) {
        this.requests.push(request);
        return this.submitResult;
    }

    drainEvents() {
        if (this.drainError) throw this.drainError;
        const events = this.events;
        this.events = [];
        return events;
    }

    push(requestId, ...events) {
        this.events.push(...events.map((event) => ({
            version: 1,
            requestId,
            ...event,
        })));
    }
}

async function loadHarmonyAdsTransport() {
    const source = await readFile(path.join(root, "MiniGame", "harmony", "HarmonyAdsTransport.ts"), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{\s*native\s*\}\s*from\s*["']cc["'];?/,
            "const native = globalThis.__harmonyNative;",
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\/HarmonyAdsProtocol["'];?/,
            `const isHarmonyAdEvent = (event) => Boolean(
                event && typeof event === "object"
                && typeof event.version === "number"
                && typeof event.requestId === "string"
                && ["accepted", "opened", "rewarded", "closed", "error"].includes(event.type)
            );`,
        );
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}#transport`)).HarmonyAdsTransport;
}

class FakeRuntime {
    constructor() {
        this.time = 0;
        this.handlers = new Set();
    }

    now = () => this.time;

    setInterval = (handler) => {
        this.handlers.add(handler);
        return handler;
    };

    clearInterval = (handler) => {
        this.handlers.delete(handler);
    };

    advance(milliseconds) {
        this.time += milliseconds;
        for (const handler of [...this.handlers]) handler();
    }

    poll() {
        for (const handler of [...this.handlers]) handler();
    }
}

async function loadHarmonyAds() {
    const source = await readFile(path.join(root, "MiniGame", "harmony", "HarmonyAds.ts"), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{\s*BaseAds\s*\}\s*from\s*["']\.\.\/Base\/BaseAds["'];?/,
            `class BaseAds {
                constructor() {
                    this._rewardAdUnitId = "";
                    this._rewardAdUnitIds = {};
                    this._interstitialAdUnitId = "";
                    this._rewardListener = null;
                    this._interstitialListener = null;
                }
                init(value, interstitialAdId) {
                    const config = typeof value === "string"
                        ? { defaultRewardAdId: value, interstitialAdId }
                        : (value || {});
                    this._rewardAdUnitIds = { ...(config.rewardAdIds || {}) };
                    if (config.defaultRewardAdId && !this._rewardAdUnitIds.default) {
                        this._rewardAdUnitIds.default = config.defaultRewardAdId;
                    }
                    this._rewardAdUnitId = this._rewardAdUnitIds.default || "";
                    this._interstitialAdUnitId = config.interstitialAdId || "";
                }
                showAds(res) { this.showRewardAd({ placement: "default" }, res); }
                setRewardAdsListener(listener) { this._rewardListener = listener; }
                setInterstitialAdsListener(listener) { this._interstitialListener = listener; }
            }`,
        )
        .replace(
            /import\s*\{\s*MiniErrorCode\s*\}\s*from\s*["']\.\.\/header["'];?/,
            `const MiniErrorCode = {
                AD_NOT_INIT: { code: -97001, msg: "广告未初始化, 需要先调用init方法初始化" },
                AD_EXIT: { code: -97002, msg: "广告中途退出" },
                AD_PLAYING: { code: -97003, msg: "广告正在播放中 不允许重复调用" },
                AD_BRIDGE_UNAVAILABLE: { code: -97004, msg: "鸿蒙广告桥接不可用" },
                AD_PROTOCOL_MISMATCH: { code: -97005, msg: "鸿蒙广告协议版本不匹配" },
                AD_TIMEOUT: { code: -97006, msg: "鸿蒙广告请求超时" },
                AD_NATIVE_ERROR: { code: -97007, msg: "鸿蒙原生广告执行失败" },
            };`,
        )
        .replace(
            /import\s+type\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/interface\/IMiniAds["'];?/,
            "",
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/interface\/IMiniAds["'];?/,
            `const MiniRewardAdPlacement = { Default: "default" };`,
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\/HarmonyAdsProtocol["'];?/,
            `const HARMONY_ADS_PROTOCOL_VERSION = 1;`,
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\/HarmonyAdsTransport["'];?/,
            `class HarmonyAdsTransport {
                getProtocolVersion() { return null; }
                submit() { return false; }
                drainEvents() { return []; }
            }`,
        );

    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
            useDefineForClassFields: false,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`)).HarmonyAds;
}

test("OPENHARMONY remains HarmonyOS instead of falling through to Browser", async () => {
    const source = await readFile(path.join(root, "Core", "engine", "Platform.ts"), "utf8");
    const previousWindow = globalThis.window;
    globalThis.window = globalThis;
    globalThis.__harmonyPlatformSys = {
        isNative: true,
        isMobile: true,
        os: "OpenHarmony",
        platform: "OPENHARMONY",
        OS: { ANDROID: "Android", IOS: "iOS", OPENHARMONY: "OpenHarmony" },
        Platform: {
            WECHAT_GAME: "WECHAT_GAME",
            ALIPAY_MINI_GAME: "ALIPAY_MINI_GAME",
            BYTEDANCE_MINI_GAME: "BYTEDANCE_MINI_GAME",
            OPPO_MINI_GAME: "OPPO_MINI_GAME",
            HUAWEI_QUICK_GAME: "HUAWEI_QUICK_GAME",
        },
    };
    const runtimeSource = source
        .replace(/import\s*\{\s*sys\s*\}\s*from\s*["']cc["'];?/, "const sys = globalThis.__harmonyPlatformSys;")
        .replace(/import\s*\{\s*Log\s*\}\s*from\s*["']\.\.\/utils\/Logger\/Log["'];?/, "const Log = () => undefined;");
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2019 },
    });
    const module = await import(`data:text/javascript,${encodeURIComponent(outputText)}#harmony`);
    new module.PlatformInitializer();

    assert.equal(module.Platform.isHarmonyOS, true);
    assert.equal(module.Platform.isBrowser, false);
    assert.equal(module.Platform.platform, module.PlatformType.HarmonyOS);
    delete globalThis.__harmonyPlatformSys;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
});

test("MiniHelper selects HarmonyAds on HarmonyOS", async () => {
    const source = await readFile(path.join(root, "MiniGame", "MiniHelper.ts"), "utf8");
    assert.match(source, /import\s*\{\s*HarmonyAds\s*\}/);
    assert.match(source, /Platform\.isHarmonyOS[\s\S]*new HarmonyAds\(\)/);
});

test("reward lifecycle only succeeds after rewarded then closed", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const transport = new FakeTransport();
    const runtime = new FakeRuntime();
    const ads = new HarmonyAds(transport, {
        pollIntervalMs: 10,
        acceptedTimeoutMs: 100,
        requestTimeoutMs: 1000,
    }, runtime);
    ads.init({
        defaultRewardAdId: "reward-default",
        rewardAdIds: { ali_browse_task: "reward-browse" },
        interstitialAdId: "interstitial",
    });

    const lifecycle = [];
    let success = 0;
    let failure;
    ads.setRewardAdsListener({
        onShow: () => lifecycle.push("show"),
        onClose: () => lifecycle.push("close"),
    });
    ads.showRewardAd({ placement: "ali_browse_task" }, {
        success: () => { success++; },
        fail: (code, message) => { failure = { code, message }; },
    });

    assert.equal(transport.requests.length, 1);
    assert.equal(transport.requests[0].action, "showReward");
    assert.equal(transport.requests[0].adId, "reward-browse");
    const requestId = transport.requests[0].requestId;

    transport.push(requestId, { type: "accepted" });
    runtime.poll();
    assert.deepEqual(lifecycle, []);
    assert.equal(success, 0);

    transport.push(requestId, { type: "opened" });
    runtime.poll();
    assert.deepEqual(lifecycle, ["show"]);

    transport.push(requestId, { type: "rewarded" }, { type: "closed" });
    runtime.poll();
    assert.equal(success, 1);
    assert.equal(failure, undefined);
    assert.deepEqual(lifecycle, ["show", "close"]);

    transport.push(requestId, { type: "closed" });
    runtime.poll();
    assert.equal(success, 1, "duplicate and late events must not settle twice");
});

test("early close, native errors and concurrent fullscreen requests fail exactly once", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const transport = new FakeTransport();
    const runtime = new FakeRuntime();
    const ads = new HarmonyAds(transport, {}, runtime);
    ads.init({ defaultRewardAdId: "reward", interstitialAdId: "interstitial" });

    const failures = [];
    ads.showRewardAd({ placement: "default" }, {
        success: () => assert.fail("early close must not reward"),
        fail: (code, message) => failures.push({ code, message }),
    });
    ads.showInterstitialAd({
        success: () => assert.fail("concurrent interstitial must not succeed"),
        fail: (code, message) => failures.push({ code, message }),
    });
    assert.equal(failures[0].code, -97003);
    assert.equal(transport.requests.length, 1);

    const firstId = transport.requests[0].requestId;
    transport.push(firstId, { type: "opened" }, { type: "closed" });
    runtime.poll();
    assert.equal(failures[1].code, -97002);

    ads.showInterstitialAd({
        fail: (code, message) => failures.push({ code, message }),
    });
    const secondId = transport.requests[1].requestId;
    transport.push(secondId, { type: "error", code: 21800003, message: "load failed" });
    runtime.poll();
    transport.push(secondId, { type: "closed" });
    runtime.poll();

    assert.deepEqual(failures[2], { code: 21800003, message: "load failed" });
    assert.equal(failures.length, 3);
});

test("missing IDs, bridge failures and protocol mismatches never fall back to success", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const runtime = new FakeRuntime();

    for (const [version, expectedCode] of [[null, -97004], [2, -97005]]) {
        const ads = new HarmonyAds(new FakeTransport(version), {}, runtime);
        ads.init({ defaultRewardAdId: "reward" });
        let result;
        ads.showRewardAd({ placement: "default" }, {
            success: () => { result = "success"; },
            fail: (code, message) => { result = { code, message }; },
        });
        assert.equal(result.code, expectedCode);
    }

    const missing = new HarmonyAds(new FakeTransport(), {}, runtime);
    missing.init({ interstitialAdId: "" });
    let missingResult;
    missing.showInterstitialAd({
        success: () => { missingResult = "success"; },
        fail: (code, message) => { missingResult = { code, message }; },
    });
    assert.equal(missingResult.code, -97001);

    const rejectedTransport = new FakeTransport();
    rejectedTransport.submitResult = false;
    const rejected = new HarmonyAds(rejectedTransport, {}, runtime);
    rejected.init({ defaultRewardAdId: "reward" });
    let rejectedResult;
    rejected.showRewardAd({ placement: "default" }, {
        success: () => { rejectedResult = "success"; },
        fail: (code, message) => { rejectedResult = { code, message }; },
    });
    assert.equal(rejectedResult.code, -97004);
});

test("queued completion is drained before wall-clock timeout is evaluated", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const transport = new FakeTransport();
    const runtime = new FakeRuntime();
    const ads = new HarmonyAds(transport, {
        pollIntervalMs: 10,
        acceptedTimeoutMs: 20,
        requestTimeoutMs: 50,
    }, runtime);
    ads.init({ defaultRewardAdId: "reward" });

    let success = 0;
    let failure;
    ads.showRewardAd({ placement: "default" }, {
        success: () => { success++; },
        fail: (code, message) => { failure = { code, message }; },
    });
    const requestId = transport.requests[0].requestId;
    transport.push(requestId, { type: "accepted" }, { type: "opened" });
    runtime.poll();

    transport.push(requestId, { type: "rewarded" }, { type: "closed" });
    runtime.advance(1000);

    assert.equal(success, 1);
    assert.equal(failure, undefined);
});

test("an unaccepted native request times out and clears the activity lock", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const transport = new FakeTransport();
    const runtime = new FakeRuntime();
    const ads = new HarmonyAds(transport, {
        acceptedTimeoutMs: 20,
        requestTimeoutMs: 100,
    }, runtime);
    ads.init({ defaultRewardAdId: "reward", interstitialAdId: "interstitial" });

    let failure;
    ads.showRewardAd({ placement: "default" }, {
        success: () => assert.fail("timeout must not reward"),
        fail: (code, message) => { failure = { code, message }; },
    });
    runtime.advance(21);
    assert.equal(failure.code, -97006);

    let interstitialSuccess = 0;
    ads.showInterstitialAd({ success: () => { interstitialSuccess++; } });
    const requestId = transport.requests[1].requestId;
    transport.push(requestId, { type: "accepted" }, { type: "opened" }, { type: "closed" });
    runtime.poll();
    assert.equal(interstitialSuccess, 1);
});
test("listener exceptions cannot interrupt terminal settlement or replay drained events", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const transport = new FakeTransport();
    const runtime = new FakeRuntime();
    const ads = new HarmonyAds(transport, {}, runtime);
    ads.init({ defaultRewardAdId: "reward", interstitialAdId: "interstitial" });

    let success = 0;
    let failure = 0;
    let secondSuccess = 0;
    ads.setRewardAdsListener({
        onShow: () => { throw new Error("game listener show failure"); },
        onClose: () => { throw new Error("game listener close failure"); },
    });
    ads.showRewardAd({ placement: "default" }, {
        success: () => {
            success++;
            ads.showInterstitialAd({ success: () => { secondSuccess++; } });
        },
        fail: () => { failure++; },
    });
    const firstId = transport.requests[0].requestId;
    transport.push(
        firstId,
        { type: "accepted" },
        { type: "opened" },
        { type: "rewarded" },
        { type: "closed" },
        { type: "error", code: 999, message: "late duplicate" },
    );
    runtime.poll();

    assert.equal(success, 1);
    assert.equal(failure, 0);
    assert.equal(transport.requests.length, 2, "success callback can start a new request");
    const secondId = transport.requests[1].requestId;
    transport.push(secondId, { type: "accepted" }, { type: "opened" }, { type: "closed" });
    runtime.poll();
    assert.equal(secondSuccess, 1);
});

test("a bridge failure after acceptance fails immediately instead of waiting for timeout", async () => {
    const HarmonyAds = await loadHarmonyAds();
    const transport = new FakeTransport();
    const runtime = new FakeRuntime();
    const ads = new HarmonyAds(transport, { requestTimeoutMs: 180000 }, runtime);
    ads.init({ defaultRewardAdId: "reward" });

    let failure;
    ads.showRewardAd({ placement: "default" }, {
        fail: (code, message) => { failure = { code, message }; },
    });
    const requestId = transport.requests[0].requestId;
    transport.push(requestId, { type: "accepted" });
    runtime.poll();
    transport.drainError = new Error("reflection unavailable");
    runtime.poll();

    assert.equal(failure.code, -97004);
    assert.equal(runtime.time, 0, "failure does not wait for the request timeout");
});

test("transport preserves legal empty queues but throws on invalid bridge responses", async () => {
    let response = "[]";
    globalThis.__harmonyNative = {
        reflection: {
            callStaticMethod: () => {
                if (response instanceof Error) throw response;
                return response;
            },
        },
    };
    const HarmonyAdsTransport = await loadHarmonyAdsTransport();
    const transport = new HarmonyAdsTransport();

    assert.deepEqual(transport.drainEvents(), []);
    for (const invalid of ["", "{}", "not-json", 1, new Error("bridge down")]) {
        response = invalid;
        assert.throws(() => transport.drainEvents());
    }
    delete globalThis.__harmonyNative;
});
