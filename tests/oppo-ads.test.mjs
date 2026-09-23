import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();

async function loadAds() {
    const source = await readFile(path.join(root, "MiniGame", "oppo", "OppoAds.ts"), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{[^}]*\}\s*from\s*["']\.\.\/\.\.\/Core["'];?/,
            "const Log = () => undefined;\nconst Warn = () => undefined;\nconst Error = () => undefined;",
        )
        .replace(
            /import\s*\{\s*BaseAds\s*\}\s*from\s*["']\.\.\/Base\/BaseAds["'];?/,
            `class BaseAds {
                constructor() {
                    this._rewardAdUnitId = "";
                    this._interstitialAdUnitId = "";
                    this._rewardAd = null;
                    this._interstitialAd = null;
                    this._rewardListener = null;
                    this._interstitialListener = null;
                    this._rewardSuccess = null;
                    this._rewardFail = null;
                    this._interstitialAdSuccess = null;
                    this._interstitialAdFail = null;
                }
                init(value, interstitialUnitId) {
                    const config = typeof value === "string"
                        ? { defaultRewardAdId: value, interstitialAdId: interstitialUnitId }
                        : (value || {});
                    this._rewardAdUnitId = config.defaultRewardAdId || "";
                    this._interstitialAdUnitId = config.interstitialAdId || "";
                    if (this._rewardAdUnitId) this._rewardAd = this.createVideoAd();
                    if (this._interstitialAdUnitId) this._interstitialAd = this.createInterstitialAd();
                }
                setRewardAdsListener(listener) { this._rewardListener = listener; }
                setInterstitialAdsListener(listener) { this._interstitialListener = listener; }
                reset() { this._rewardSuccess = null; this._rewardFail = null; }
            }`,
        )
        .replace(
            /import\s*\{\s*MiniErrorCode\s*\}\s*from\s*["']\.\.\/header["'];?/,
            `const MiniErrorCode = {
                AD_NOT_INIT: { code: -97001, msg: "广告未初始化" },
                AD_EXIT: { code: -97002, msg: "广告中途退出" },
                AD_PLAYING: { code: -97003, msg: "广告正在播放中" },
            };`,
        )
        .replace(
            /import\s*\{[^}]*MiniRewardAdPlacement[^}]*\}\s*from\s*["']\.\.\/interface\/IMiniAds["'];?/,
            `const MiniRewardAdPlacement = { Default: "default" };`,
        );
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`)).OppoAds;
}

const OppoAds = await loadAds();
const hadQG = Object.hasOwn(globalThis, "qg");
const previousQG = globalThis.qg;

test.after(() => {
    if (hadQG) globalThis.qg = previousQG;
    else delete globalThis.qg;
});

test("OppoAds rewards a completed video and rejects an interrupted video", async () => {
    let rewardAd;
    const order = [];
    globalThis.qg = {
        createRewardedVideoAd: () => {
            rewardAd = {
                load: async () => { order.push("load"); },
                show: async () => { order.push("show"); },
                onLoad: () => undefined,
                onError: () => undefined,
                onClose: (callback) => { rewardAd.close = callback; },
            };
            return rewardAd;
        },
    };

    const ads = new OppoAds();
    ads.init({ defaultRewardAdId: "reward-id" });

    let success = 0;
    let failure;
    ads.showRewardAd({ placement: "default" }, {
        success: () => { success++; },
        fail: (code, message) => { failure = { code, message }; },
    });
    await Promise.resolve();
    assert.deepEqual(order, ["load", "show"]);

    rewardAd.close({ isEnded: true });
    assert.equal(success, 1);
    assert.equal(failure, undefined);

    ads.showRewardAd({ placement: "default" }, {
        success: () => { success++; },
        fail: (code, message) => { failure = { code, message }; },
    });
    await Promise.resolve();
    rewardAd.close({ isEnded: false });
    assert.deepEqual(failure, { code: -97002, message: "广告中途退出" });
});

test("OppoAds loads and closes an interstitial ad", async () => {
    let interstitialAd;
    const order = [];
    globalThis.qg = {
        createInterstitialAd: () => {
            interstitialAd = {
                load: async () => { order.push("load"); },
                show: async () => { order.push("show"); },
                onLoad: () => undefined,
                onError: () => undefined,
                onClose: (callback) => { interstitialAd.close = callback; },
            };
            return interstitialAd;
        },
    };

    const ads = new OppoAds();
    ads.init({ interstitialAdId: "interstitial-id" });

    let success = 0;
    let listenerClose = 0;
    ads.setInterstitialAdsListener({ onShow: () => undefined, onClose: () => { listenerClose++; } });
    ads.showInterstitialAd({ success: () => { success++; } });
    await Promise.resolve();
    assert.deepEqual(order, ["load", "show"]);

    interstitialAd.close();
    assert.equal(success, 1);
    assert.equal(listenerClose, 1);
});
