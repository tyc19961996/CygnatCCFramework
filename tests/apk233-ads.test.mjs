import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import typescript from "typescript";

function harness({ android = true, native = true, version = 1 } = {}) {
    const requests = [];
    const events = [];
    const calls = [];
    const timers = new Set();
    let time = 0;
    const cc = {
        sys: {
            isNative: native,
            isMobile: true,
            os: android ? "Android" : "Windows",
            platform: native && android ? "ANDROID" : "WEB",
            OS: { ANDROID: "Android", IOS: "iOS", OPENHARMONY: "OHOS" },
            Platform: { ANDROID: "ANDROID" },
        },
        native: {
            reflection: {
                callStaticMethod(className, method, signature, body) {
                    calls.push({ className, method, signature });
                    if (method === "getProtocolVersion") return version;
                    if (method === "drainEvents") return JSON.stringify(events.splice(0));
                    requests.push(JSON.parse(body));
                    return true;
                },
            },
        },
    };
    const modules = new Map();
    function load(file) {
        if (modules.has(file)) return modules.get(file).exports;
        const module = { exports: {} };
        modules.set(file, module);
        const source = readFileSync(file, "utf8");
        const { outputText } = typescript.transpileModule(source, {
            compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2019 },
        });
        const require = (name) => {
            if (name === "cc") return cc;
            if (name.endsWith("/Logger/Log")) return { Log() {} };
            const filename = path.resolve(path.dirname(file), name);
            return load(existsSync(filename + ".ts") ? filename + ".ts" : path.join(filename, "index.ts"));
        };
        new Function("require", "module", "exports", "window", "setInterval", "clearInterval", "Date", outputText)(
            require, module, module.exports, {},
            (callback) => { timers.add(callback); return callback; },
            (callback) => timers.delete(callback), { now: () => time },
        );
        return module.exports;
    }
    return {
        calls, requests,
        advance(ms) {
            time += ms;
            for (const timer of [...timers]) timer();
        },
        event(requestId, type, data = {}) { events.push({ requestId, type, ...data }); },
        platform() {
            const { Platform, PlatformInitializer, PlatformType } = load(path.resolve("Core/engine/Platform.ts"));
            new PlatformInitializer();
            return { Platform, PlatformType };
        },
        ads(config = { appId: "app-key", defaultRewardAdId: "101", interstitialAdId: "102", bannerAdId: "103" }) {
            const { Apk233Ads } = load(path.resolve("MiniGame/apk233/Apk233Ads.ts"));
            const ads = new Apk233Ads();
            ads.init(config);
            return ads;
        },
    };
}

test("233 标记只对带有广告桥接的 Android 原生 APK 生效", () => {
    const { Platform, PlatformType } = harness().platform();
    assert.equal(Platform.platform, PlatformType.Apk233);
    assert.equal(Platform.isApk233, true);
    assert.equal(Platform.isAndroid, true);
    assert.equal(harness({ version: 0 }).platform().Platform.isApk233, false);
    const web = harness({ native: false });
    assert.equal(web.platform().Platform.isApk233, false);
    assert.deepEqual(web.calls, []);
});

test("MiniHelper 只在广告入口选择 233 适配器", () => {
    const code = readFileSync("MiniGame/MiniHelper.ts", "utf8");
    const [common, ad, pay] = code.split(/public static (?:ad|pay)</);
    assert.doesNotMatch(common, /isApk233/);
    assert.match(common, /new BaseCommon\(\)/);
    assert.match(ad, /Platform\.isApk233[\s\S]*?new Apk233Ads\(\)/);
    assert.doesNotMatch(pay, /isApk233/);
});

test("激励只在奖励确认并关闭后结算一次，播放时拒绝另一条全屏广告", () => {
    const h = harness();
    const ads = h.ads();
    const outcomes = [];
    ads.setRewardAdsListener({ onShow: () => outcomes.push("打开"), onClose: () => outcomes.push("关闭") });
    ads.showAds({ success: () => outcomes.push("奖励"), fail: assert.fail });
    const [{ requestId, kind, pos, appKey }] = h.requests;
    assert.deepEqual([kind, pos, appKey], ["reward", 101, "app-key"]);
    assert.equal(h.calls.find((call) => call.method === "submit").signature, "(Ljava/lang/String;)Z");
    h.event(requestId, "opened");
    h.event(requestId, "rewarded");
    h.advance(100);
    assert.deepEqual(outcomes, ["打开"]);
    const busy = [];
    ads.showInterstitialAd({ fail: (code) => busy.push(code) });
    assert.deepEqual(busy, [-97003]);
    assert.equal(h.requests.length, 1);
    h.event(requestId, "closed");
    h.event(requestId, "closed");
    h.advance(100);
    assert.deepEqual(outcomes, ["打开", "关闭", "奖励"]);
});

test("提前关闭、原生错误和超时各自失败，旧请求事件无法结算新请求", () => {
    const h = harness();
    const ads = h.ads();
    const errors = [];
    const callback = { success: assert.fail, fail: (code, message) => errors.push([code, message]) };
    ads.showAds(callback);
    h.event(h.requests.at(-1).requestId, "closed");
    h.advance(100);
    ads.showAds(callback);
    const previous = h.requests.at(-1).requestId;
    h.advance(181000);
    assert.deepEqual(h.requests.at(-1), { requestId: previous, kind: "expireFullScreen" });
    ads.showAds(callback);
    h.event(previous, "rewarded");
    h.event(previous, "closed");
    h.event(h.requests.at(-1).requestId, "error", { code: 30008, message: "广告位未关联" });
    h.advance(100);
    assert.deepEqual(errors.map(([code]) => code), [-97002, -97006, 30008]);
    assert.equal(errors.at(-1)[1], "广告位未关联");
});

test("插屏在展示并关闭后成功，缺少或非法广告位不触发桥接", () => {
    const h = harness();
    const ads = h.ads();
    const results = [];
    ads.showInterstitialAd({ success: () => results.push("完成"), fail: assert.fail });
    const [{ requestId, kind, pos }] = h.requests;
    assert.deepEqual([kind, pos], ["interstitial", 102]);
    h.event(requestId, "opened");
    h.event(requestId, "closed");
    h.advance(100);
    assert.deepEqual(results, ["完成"]);
    ads.init({ appId: "app-key", interstitialAdId: "1e3" });
    const errors = [];
    ads.showInterstitialAd({ success: assert.fail, fail: (code) => errors.push(code) });
    assert.deepEqual(errors, [-97001]);
    assert.equal(h.requests.length, 1);
});

test("Banner 显示后可与全屏广告并存，隐藏后忽略旧回调", () => {
    const h = harness();
    const ads = h.ads();
    const outcomes = [];
    ads.setBannerAdsListener({ onShow: () => outcomes.push("打开"), onClose: () => outcomes.push("关闭") });
    ads.showBannerAd({}, { success: () => outcomes.push("显示"), fail: assert.fail });
    const [{ requestId, kind, pos }] = h.requests;
    assert.deepEqual([kind, pos], ["banner", 103]);
    h.event(requestId, "opened");
    h.advance(100);
    ads.showInterstitialAd();
    ads.hideBannerAd();
    assert.deepEqual(h.requests.map((request) => request.kind), ["banner", "interstitial", "closeBanner"]);
    h.event(requestId, "opened");
    h.event(requestId, "closed");
    h.advance(100);
    assert.deepEqual(outcomes, ["打开", "显示", "关闭"]);
});

test("未配置 Banner 时返回失败，隐藏待展示的 Banner 只取消一次", () => {
    const h = harness();
    const ads = h.ads({ appId: "app-key" });
    const errors = [];
    const callback = { success: assert.fail, fail: (code) => errors.push(code) };
    ads.showBannerAd(undefined, callback);
    assert.equal(h.requests.length, 0);
    ads.init({ appId: "app-key", bannerAdId: "103" });
    ads.showBannerAd(undefined, callback);
    ads.destroyBannerAd();
    ads.hideBannerAd();
    assert.deepEqual(errors, [-97001]);
    h.event(h.requests[0].requestId, "closed");
    h.advance(100);
    assert.deepEqual(errors, [-97001, -97002]);
    assert.deepEqual(h.requests.map((request) => request.kind), ["banner", "closeBanner"]);
});


test("原生确认奖励后即使没有广告展示事件，关闭仍能结算", () => {
    const h = harness();
    const ads = h.ads();
    let rewarded = false;
    ads.showAds({ success: () => { rewarded = true; }, fail: assert.fail });
    const [{ requestId }] = h.requests;
    h.event(requestId, "rewarded");
    h.event(requestId, "closed");
    h.advance(100);
    assert.equal(rewarded, true);
});

test("Banner 等待原生确认关闭，并向监听器传递关闭失败", () => {
    const h = harness();
    const ads = h.ads();
    const outcomes = [];
    ads.setBannerAdsListener({
        onClose: () => outcomes.push("关闭"),
        onError: (code) => outcomes.push(code),
    });
    ads.showBannerAd();
    const [{ requestId }] = h.requests;
    h.event(requestId, "opened");
    h.advance(100);
    ads.hideBannerAd();
    assert.deepEqual(outcomes, []);
    h.event(requestId, "error", { code: -97007, message: "关闭失败" });
    h.advance(100);
    assert.deepEqual(outcomes, [-97007]);
});
