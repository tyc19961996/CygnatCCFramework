import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();

async function loadBaseAds() {
    const source = await readFile(path.join(root, "MiniGame", "Base", "BaseAds.ts"), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{\s*MiniErrorCode\s*\}\s*from\s*["']\.\.\/header["'];?/,
            `const MiniErrorCode = {
                AD_NOT_INIT: { code: -97001, msg: "广告未初始化, 需要先调用init方法初始化" },
                AD_PLAYING: { code: -97003, msg: "广告正在播放中" },
            };`,
        )
        .replace(
            /import\s*\{[^}]*\}\s*from\s*["']\.\.\/interface\/IMiniAds["'];?/s,
            `const MiniRewardAdPlacement = { Default: "default" };`,
        );
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`)).BaseAds;
}

test("BaseAds supports the Banner lazy lifecycle and normalized callbacks", async () => {
    const BaseAds = await loadBaseAds();
    let created;
    let createCount = 0;
    class TestAds extends BaseAds {
        createBannerAd(options) {
            createCount++;
            created = {
                options: this.getBannerCreateOptions(options),
                style: {},
                showCalls: 0,
                hideCalls: 0,
                destroyCalls: 0,
                nextShowError: null,
                onLoad(callback) { this.load = callback; },
                onError(callback) { this.error = callback; },
                onResize(callback) { this.resize = callback; },
                onClose(callback) { this.close = callback; },
                show() {
                    this.showCalls++;
                    if (this.nextShowError) {
                        const error = this.nextShowError;
                        this.nextShowError = null;
                        return Promise.reject(error);
                    }
                    return Promise.resolve();
                },
                hide() { this.hideCalls++; },
                destroy() { this.destroyCalls++; },
            };
            return created;
        }
    }

    const ads = new TestAds();
    let success = 0;
    let failure = 0;
    const events = [];
    ads.init({ bannerAdId: "banner-id" });
    ads.setBannerAdsListener({
        onShow: () => events.push("show"),
        onClose: () => events.push("close"),
        onResize: (size) => events.push(["resize", size]),
        onError: () => events.push("error"),
    });

    assert.equal(created, undefined, "init should not eagerly create a Banner");
    ads.showBannerAd({ adIntervals: 30, style: { left: 1, top: 2, width: 320 } }, {
        success: () => { success++; },
        fail: () => { failure++; },
    });
    assert.notEqual(created, undefined, "Banner should be created lazily by showBannerAd");
    assert.equal(createCount, 1, "the first show should create one Banner instance");
    await Promise.resolve();
    assert.deepEqual(created.options, {
        adUnitId: "banner-id",
        adIntervals: 30,
        style: { left: 1, top: 2, width: 320 },
    });
    assert.equal(success, 1);
    assert.equal(failure, 0);
    assert.deepEqual(events[0], "show");

    created.resize({ width: 320, height: 100, ignored: true });
    assert.deepEqual(events[1], ["resize", { width: 320, height: 100 }]);
    created.close();
    assert.equal(events[2], "close");

    created.nextShowError = { errorCode: 41, errorMessage: "banner-fail" };
    ads.showBannerAd(undefined, {
        success: () => { success++; },
        fail: () => { failure++; },
    });
    created.error({ errorCode: 41, errorMessage: "banner-fail" });
    await Promise.resolve();
    assert.equal(createCount, 1, "changing only style/options omitted should reuse the Banner instance");
    assert.equal(failure, 1);
    assert.equal(events.filter((event) => event === "error").length, 1);

    ads.hideBannerAd();
    ads.hideBannerAd();
    assert.equal(created.hideCalls, 2);
    ads.destroyBannerAd();
    ads.destroyBannerAd();
    assert.equal(created.destroyCalls, 1);
});

test("BaseAds reports unsupported Banner platforms and rebuilds on interval changes", async () => {
    const BaseAds = await loadBaseAds();
    let createCount = 0;
    const instances = [];
    class TestAds extends BaseAds {
        createBannerAd(options) {
            createCount++;
            const ad = {
                style: {},
                show() { return Promise.resolve(); },
                hideCalls: 0,
                destroyCalls: 0,
                hide() { this.hideCalls++; },
                destroy() { this.destroyCalls++; },
                onError(callback) { this.error = callback; },
                onResize() {},
                onClose() {},
            };
            instances.push({ options: this.getBannerCreateOptions(options), ad });
            return ad;
        }
    }

    const ads = new TestAds();
    ads.init({ bannerAdId: "banner-id" });
    ads.showBannerAd({ adIntervals: 30 });
    await Promise.resolve();
    ads.showBannerAd({ adIntervals: 60 });
    await Promise.resolve();
    assert.equal(createCount, 2);
    assert.equal(instances[0].ad.destroyCalls, 1);
    assert.equal(instances[1].options.adIntervals, 60);

    const unsupported = new BaseAds();
    let failure;
    let errorEvent;
    unsupported.setBannerAdsListener({
        onError: (code, message) => { errorEvent = { code, message }; },
    });
    unsupported.showBannerAd({}, {
        fail: (code, message) => { failure = { code, message }; },
    });
    assert.deepEqual(failure, { code: -97001, message: "广告未初始化, 需要先调用init方法初始化" });
    assert.deepEqual(errorEvent, failure);
});

test("all supported platform adapters expose Banner creation hooks and declarations", async () => {
    const platforms = [
        ["wechat/WechatAds.ts", "lib.wx.api.d.ts", "wx"],
        ["alipay/AlipayAds.ts", "lib.ali.api.d.ts", "my"],
        ["bilibili/BilibiliAds.ts", "lib.bilibili.api.d.ts", "bl"],
        ["kuaishou/KuaiShouAds.ts", "lib.kuaishou.api.d.ts", "ks"],
        ["bytedance/BytedanceAds.ts", "lib.bytedance.api.d.ts", "tt"],
        ["oppo/OppoAds.ts", "lib.oppo.api.d.ts", "qg"],
    ];

    for (const [adapter, declaration, globalName] of platforms) {
        const adapterSource = await readFile(path.join(root, "MiniGame", adapter), "utf8");
        const declarationSource = await readFile(path.join(root, "MiniGame", "types", declaration), "utf8");
        assert.match(adapterSource, new RegExp(`${globalName}\\.createBannerAd`), `${adapter} should call ${globalName}.createBannerAd`);
        assert.match(declarationSource, /BannerAd/, `${declaration} should declare BannerAd`);
        assert.match(declarationSource, /createBannerAd/, `${declaration} should declare createBannerAd`);
    }
});

async function loadPlatformAds(adapterPath, className) {
    const baseSource = await readFile(path.join(root, "MiniGame", "Base", "BaseAds.ts"), "utf8");
    const baseRuntime = baseSource
        .replace(
            /import\s*\{\s*MiniErrorCode\s*\}\s*from\s*["']\.\.\/header["'];?/,
            `const MiniErrorCode = {
                AD_NOT_INIT: { code: -97001, msg: "广告未初始化, 需要先调用init方法初始化" },
                AD_PLAYING: { code: -97003, msg: "广告正在播放中" },
            };`,
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/interface\/IMiniAds["'];?/,
            `const MiniRewardAdPlacement = { Default: "default" };`,
        )
        .replace("export class BaseAds", "class BaseAds");

    const source = await readFile(path.join(root, "MiniGame", adapterPath), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/\.\.\/Core["'];?/,
            "const Log = () => undefined;\nconst Warn = () => undefined;\nconst Error = () => undefined;",
        )
        .replace(
            /import\s*\{\s*BaseAds\s*\}\s*from\s*["']\.\.\/Base\/BaseAds["'];?/,
            baseRuntime,
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/header["'];?/,
            "",
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/interface\/IMiniAds["'];?/,
            "",
        );

    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`))[className];
}

function createBannerFake(record) {
    const ad = {
        style: {},
        showCalls: 0,
        hideCalls: 0,
        destroyCalls: 0,
        nextError: null,
        show() {
            this.showCalls++;
            if (this.nextError) {
                const error = this.nextError;
                this.nextError = null;
                return Promise.reject(error);
            }
            return Promise.resolve();
        },
        hide() {
            this.hideCalls++;
        },
        destroy() {
            this.destroyCalls++;
        },
        onLoad(callback) { this.load = callback; },
        onError(callback) { this.error = callback; },
        onResize(callback) { this.resize = callback; },
        onClose(callback) { this.close = callback; },
        onShow(callback) { this.shown = callback; },
    };
    record.ad = ad;
    return ad;
}

test("all platform adapters create and manage Banner instances", async () => {
    const cases = [
        ["wechat/WechatAds.ts", "WechatAds", "wx"],
        ["alipay/AlipayAds.ts", "AlipayAds", "my"],
        ["bilibili/BilibiliAds.ts", "BilibiliAds", "bl"],
        ["kuaishou/KuaiShouAds.ts", "KuaiShouAds", "ks"],
        ["bytedance/BytedanceAds.ts", "BytedanceAds", "tt"],
        ["oppo/OppoAds.ts", "OppoAds", "qg"],
    ];
    const previous = new Map();
    const errorShapes = {
        wx: { errCode: 11, errMsg: "wx-fail" },
        my: { error: 41, errorMessage: "ali-fail" },
        bl: { errorCode: 21, errorMessage: "bl-fail" },
        ks: { code: 31, msg: "ks-fail" },
        tt: { errCode: 51, errMsg: "tt-fail" },
        qg: { code: 61, msg: "qg-fail" },
    };

    for (const [adapterPath, className, globalName] of cases) {
        const Ads = await loadPlatformAds(adapterPath, className);
        previous.set(globalName, globalThis[globalName]);
        const record = { options: null, ad: null };
        globalThis[globalName] = {
            createBannerAd(options) {
                record.options = options;
                return createBannerFake(record);
            },
        };

        const ads = new Ads();
        const events = [];
        let success = 0;
        let failure = 0;
        ads.init({ bannerAdId: "banner-id" });
        ads.setBannerAdsListener({
            onShow: () => events.push("show"),
            onClose: () => events.push("close"),
            onResize: (size) => events.push(["resize", size]),
            onError: () => events.push("error"),
        });
        ads.showBannerAd({
            style: { left: 1, top: 2, width: 320, height: 100 },
            adIntervals: 30,
        }, {
            success: () => { success++; },
            fail: () => { failure++; },
        });
        await Promise.resolve();

        assert.equal(record.options.adUnitId, "banner-id", globalName);
        assert.deepEqual(record.options.style, { left: 1, top: 2, width: 320, height: 100 }, globalName);
        assert.equal(record.options.adIntervals, 30, globalName);
        assert.equal(success, 1, globalName);
        assert.equal(failure, 0, globalName);
        record.ad.resize({ width: 320, height: 100 });
        record.ad.close();
        assert.deepEqual(events, ["show", ["resize", { width: 320, height: 100 }], "close"], globalName);

        let errorFailure;
        record.ad.nextError = errorShapes[globalName];
        ads.showBannerAd({}, {
            fail: (code, message) => { errorFailure = { code, message }; },
        });
        record.ad.error(errorShapes[globalName]);
        await Promise.resolve();
        assert.deepEqual(errorFailure, {
            code: errorShapes[globalName].errCode
                ?? errorShapes[globalName].errorCode
                ?? errorShapes[globalName].code
                ?? errorShapes[globalName].error,
            message: errorShapes[globalName].errMsg
                ?? errorShapes[globalName].errorMessage
                ?? errorShapes[globalName].msg,
        }, globalName);
        assert.equal(events.filter((event) => event === "error").length, 1, globalName);

        ads.hideBannerAd();
        ads.destroyBannerAd();
        ads.destroyBannerAd();
        assert.equal(record.ad.hideCalls, 2, globalName);
        assert.equal(record.ad.destroyCalls, 1, globalName);
    }

    for (const [globalName, value] of previous) {
        if (value === undefined) delete globalThis[globalName];
        else globalThis[globalName] = value;
    }
});
