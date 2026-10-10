import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();
const nativeRoot = path.join(root, "native", "harmonyos-next");
const harRoot = path.join(nativeRoot, "cygnat-harmony-ads");

async function source(relativePath) {
    return readFile(path.join(harRoot, relativePath), "utf8");
}

test("Harmony Ads source HAR uses the DevEco harTasks module layout", async () => {
    const [hvigor, buildProfile, moduleConfig, ohPackage, index, workerEntry] = await Promise.all([
        source("hvigorfile.ts"),
        source("build-profile.json5"),
        source(path.join("src", "main", "module.json5")),
        source("oh-package.json5"),
        source("Index.ets"),
        source("Worker.ts"),
    ]);

    assert.match(hvigor, /export\s+default\s*\{/);
    assert.match(hvigor, /system:\s*harTasks/);
    assert.match(buildProfile, /apiType['"]?\s*:\s*['"]stageMode['"]/);
    assert.match(moduleConfig, /"type"\s*:\s*"har"/);
    assert.match(ohPackage, /"name"\s*:\s*"@cygnat\/harmony-ads"/);
    assert.match(index, /HarmonyAdsService/);
    assert.match(index, /HarmonyAdsWorkerQueue/);
    assert.match(workerEntry, /HarmonyAdsWorkerQueue/);
    assert.doesNotMatch(workerEntry, /\.ets['"]/);
});

test("native service loads AdsKit reward and interstitial ads with authenticated status events", async () => {
    const service = await source(path.join("src", "main", "ets", "HarmonyAdsService.ets"));

    assert.match(service, /import\s*\{\s*advertising\s*\}\s*from\s*['"]@kit\.AdsKit['"]/);
    assert.match(service, /new\s+advertising\.AdLoader/);
    assert.match(service, /loadAd\s*\(/);
    assert.match(service, /advertising\.showAd\s*\(/);
    assert.match(service, /REWARD_AD_TYPE\s*:\s*number\s*=\s*7/);
    assert.match(service, /INTERSTITIAL_AD_TYPE\s*:\s*number\s*=\s*12/);
    assert.match(service, /PPS_REWARD_STATUS_CHANGED/);
    assert.match(service, /PPS_INTERSTITIAL_STATUS_CHANGED/);
    assert.match(service, /reward_ad_status/);
    assert.match(service, /interstitial_ad_status/);
    assert.match(service, /publisherBundleName:\s*['"]com\.huawei\.hms\.adsservice['"]/);
    assert.match(service, /onAdOpen/);
    assert.match(service, /onAdReward/);
    assert.match(service, /onAdClose/);

    const subscribeIndex = service.indexOf("commonEventManager.subscribe");
    const loadIndex = service.indexOf("loader.loadAd");
    assert.ok(subscribeIndex >= 0 && loadIndex > subscribeIndex, "status subscription must be registered before load/show");
});

test("native core stays game-independent and exposes injected host boundaries", async () => {
    const files = await Promise.all([
        source("Index.ets"),
        source(path.join("src", "main", "ets", "AdsProtocol.ts")),
        source(path.join("src", "main", "ets", "HarmonyAdsService.ets")),
        source(path.join("src", "main", "ets", "HarmonyAdsWorkerQueue.ts")),
    ]);
    const all = files.join("\n");

    assert.doesNotMatch(all, /libcocos\.so/);
    assert.doesNotMatch(all, /PortProxy/);
    assert.doesNotMatch(all, /com\.yiwan|testx9dtjwj8hp|testb4znbuh3n2/);
    assert.match(all, /common\.UIAbilityContext/);
    assert.match(all, /sendToWorker/);
    assert.match(all, /MAX_QUEUED_EVENTS/);
    assert.match(all, /requestId/);
    assert.match(all, /HARMONY_ADS_PROTOCOL_VERSION/);
});

test("thin reflection endpoint only submits and drains primitive values", async () => {
    const bridge = await readFile(
        path.join(nativeRoot, "glue", "CygnatHarmonyAdsBridge.ets"),
        "utf8",
    );

    assert.match(bridge, /getProtocolVersion/);
    assert.match(bridge, /submitHarmonyAdRequest/);
    assert.match(bridge, /drainHarmonyAdEvents/);
    assert.match(bridge, /function\s+submit\([^)]*string[^)]*\)\s*:\s*boolean/);
    assert.match(bridge, /function\s+drainEvents\([^)]*string[^)]*\)\s*:\s*string/);
    assert.doesNotMatch(bridge, /AdsKit|libcocos|PortProxy/);
    assert.match(bridge, /@cygnat\/harmony-ads\/Worker/);
});
async function loadHarmonyAdsService() {
    const serviceSource = await source(path.join("src", "main", "ets", "HarmonyAdsService.ets"));
    const runtimeSource = serviceSource
        .replace(/import\s*\{\s*common\s*\}\s*from\s*['"]@kit\.AbilityKit['"];?/, "const common = {};")
        .replace(/import\s*\{\s*advertising\s*\}\s*from\s*['"]@kit\.AdsKit['"];?/, "const advertising = globalThis.__harmonyAdvertising;")
        .replace(
            /import\s*\{\s*BusinessError,\s*commonEventManager\s*\}\s*from\s*['"]@kit\.BasicServicesKit['"];?/,
            "const commonEventManager = globalThis.__harmonyCommonEvents;",
        )
        .replace(
            /import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/AdsProtocol['"];?/,
            `const HARMONY_ADS_PROTOCOL_VERSION = 1;
            const parseHarmonyAdRequest = (value) => JSON.parse(value);`,
        )
        .replace(/\bsetTimeout\(/g, "globalThis.__harmonyTimers.setTimeout(")
        .replace(/\bclearTimeout\(/g, "globalThis.__harmonyTimers.clearTimeout(");
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return import(`data:text/javascript,${encodeURIComponent(outputText)}#native-service-${Date.now()}`);
}

test("native service filters stale broadcasts and always releases its global activity lock", async () => {
    const state = {
        subscriber: null,
        loadListeners: [],
        shown: 0,
        unsubscribed: 0,
        timers: [],
        clearedTimers: [],
    };
    globalThis.__harmonyAdvertising = {
        AdLoader: class {
            loadAd(_params, _options, listener) {
                state.loadListeners.push(listener);
            }
        },
        showAd: () => { state.shown++; },
    };
    globalThis.__harmonyCommonEvents = {
        createSubscriberSync: () => ({}),
        subscribe: (_subscriber, callback) => { state.subscriber = callback; },
        unsubscribe: () => { state.unsubscribed++; },
    };
    globalThis.__harmonyTimers = {
        setTimeout: (handler) => {
            state.timers.push(handler);
            return state.timers.length;
        },
        clearTimeout: (handle) => { state.clearedTimers.push(handle); },
    };

    const { HarmonyAdsService } = await loadHarmonyAdsService();
    const service = new HarmonyAdsService();
    const events = [];
    const request = (requestId, action = "showReward") => JSON.stringify({
        version: 1,
        requestId,
        action,
        adId: `ad-${requestId}`,
    });
    const send = (eventJson) => events.push(JSON.parse(eventJson));
    const broadcast = (status) => state.subscriber(
        { code: 0, message: "" },
        { parameters: { reward_ad_status: status, interstitial_ad_status: status } },
    );

    service.handleRequest({}, request("first"), send);
    state.loadListeners.at(-1).onAdLoadSuccess([{}]);
    broadcast("onAdReward");
    broadcast("onAdClose");
    assert.deepEqual(events.map((event) => event.type), ["accepted"], "stale broadcasts before open are ignored");

    broadcast("onAdOpen");
    broadcast("onAdReward");
    broadcast("onAdClose");
    assert.deepEqual(events.map((event) => event.type), ["accepted", "opened", "rewarded", "closed"]);
    assert.equal(state.unsubscribed, 1);

    service.handleRequest({}, request("timeout"), send);
    assert.ok(state.timers.length >= 2, "every accepted request owns a native watchdog");
    state.timers.at(-1)();
    service.handleRequest({}, request("after-timeout"), send);
    assert.equal(events.at(-1).type, "accepted", "watchdog timeout releases the global lock");
    state.loadListeners.at(-1).onAdLoadFailure(21800003, "cleanup");
    service.handleRequest({}, request("showing-timeout"), send);
    state.loadListeners.at(-1).onAdLoadSuccess([{}]);
    state.timers.at(-1)();
    service.handleRequest({}, request("blocked-until-close"), send);
    assert.equal(events.at(-1).requestId, "blocked-until-close");
    assert.equal(events.at(-1).code, -97003, "timed-out visible ad keeps native ownership");
    broadcast("onAdClose");
    service.handleRequest({}, request("after-timed-out-close"), send);
    assert.equal(events.at(-1).type, "accepted");
    state.loadListeners.at(-1).onAdLoadFailure(21800003, "cleanup");


    assert.doesNotThrow(() => service.handleRequest({}, request("accepted-send-throws"), () => {
        throw new Error("worker unavailable");
    }));
    service.handleRequest({}, request("after-accepted-send-throws"), send);
    assert.equal(events.at(-1).type, "accepted", "accepted send failure releases the global lock");
    state.loadListeners.at(-1).onAdLoadFailure(21800003, "cleanup");

    const closeSend = (eventJson) => {
        const event = JSON.parse(eventJson);
        if (event.type === "closed") throw new Error("worker unavailable on close");
        events.push(event);
    };
    service.handleRequest({}, request("close-send-throws"), closeSend);
    state.loadListeners.at(-1).onAdLoadSuccess([{}]);
    broadcast("onAdOpen");
    assert.doesNotThrow(() => broadcast("onAdClose"));
    service.handleRequest({}, request("after-close-send-throws"), send);
    assert.equal(events.at(-1).type, "accepted", "closed send failure releases the global lock");

    delete globalThis.__harmonyAdvertising;
    delete globalThis.__harmonyCommonEvents;
    delete globalThis.__harmonyTimers;
});
