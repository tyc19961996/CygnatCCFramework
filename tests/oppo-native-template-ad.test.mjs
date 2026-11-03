import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2019 },
}).outputText;
const header = await readFile("MiniGame/header.ts", "utf8");
const adsInterface = await readFile("MiniGame/interface/IMiniAds.ts", "utf8");
const base = await readFile("MiniGame/Base/BaseAds.ts", "utf8");
const oppo = await readFile("MiniGame/oppo/OppoAds.ts", "utf8");
const stripImports = (source) => source.replace(/import\s+[\s\S]*?from\s*["'][^"']+["'];?/g, "");
const runtime = transpile(`const Log = () => {}; const Warn = () => {};\n${header}\n${stripImports(adsInterface)}\n${stripImports(base)}\n${stripImports(oppo)}`);
const { OppoAds, BaseAds } = await import(`data:text/javascript,${encodeURIComponent(runtime)}`);
const oldQG = globalThis.qg;
test.after(() => { if (oldQG === undefined) delete globalThis.qg; else globalThis.qg = oldQG; });
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

function setup(show = () => Promise.resolve()) {
    const instances = [];
    globalThis.qg = { createCustomAd(options) {
        const callbacks = {};
        const ad = { options, callbacks, detached: [], hidden: 0, destroyed: 0,
            show: () => show(ad), hide() { this.hidden++; callbacks.Hide?.(); },
            destroy() { this.destroyed++; },
        };
        for (const name of ["Load", "Show", "Hide", "Error", "Click"]) {
            ad[`on${name}`] = (callback) => { callbacks[name] = callback; };
            ad[`off${name}`] = (callback) => { assert.equal(callback, callbacks[name]); ad.detached.push(name); };
        }
        instances.push(ad);
        return ad;
    } };
    const ads = new OppoAds();
    ads.init({ nativeTemplateAdId: "template-id" });
    return { ads, instances };
}

test("模板广告惰性创建，仅传递官方样式字段，直接展示并转发五种事件", async () => {
    const { ads, instances } = setup();
    assert.equal(instances.length, 0);
    const events = [];
    ads.setNativeTemplateAdsListener({
        onLoad: () => events.push("load"), onShow: () => events.push("show"),
        onHide: () => events.push("hide"), onClick: (event) => events.push(event),
        onError: (code, message) => events.push([code, message]),
    });
    let success = 0;
    const style = { top: 12, left: 3, width: 328, height: 999 };
    ads.showNativeTemplateAd({ style }, { success: () => success++ });
    const ad = instances[0];
    assert.deepEqual(ad.options, { adUnitId: "template-id", style: { top: 12, left: 3, width: 328 } });
    style.width = 1;
    assert.equal(ad.options.style.width, 328);
    ad.callbacks.Load(); ad.callbacks.Show(); ad.callbacks.Click({ code: 0, msg: "点击" });
    await flush();
    assert.equal(success, 1);
    ads.hideNativeTemplateAd();
    assert.deepEqual(events, ["load", "show", { code: 0, msg: "点击" }, "hide"]);
    ads.destroyNativeTemplateAd(); ads.destroyNativeTemplateAd();
    assert.equal(ad.destroyed, 1);
    assert.equal(ad.detached.length, 5);
    ad.callbacks.Load(); ad.callbacks.Show(); ad.callbacks.Hide(); ad.callbacks.Click({}); ad.callbacks.Error({});
    assert.equal(events.length, 4);
});

test("模板广告相同样式复用，改变样式重建，重新初始化释放旧实例", async () => {
    const { ads, instances } = setup();
    ads.showNativeTemplateAd({ style: { width: 328 } }); await flush();
    ads.hideNativeTemplateAd();
    ads.showNativeTemplateAd({ style: { width: 328 } }); await flush();
    assert.equal(instances.length, 1);
    ads.showNativeTemplateAd({ style: { width: 400 } }); await flush();
    assert.equal(instances.length, 2);
    assert.equal(instances[0].destroyed, 1);
    ads.init({ nativeTemplateAdId: "new-id" });
    assert.equal(instances[1].destroyed, 1);
    ads.showNativeTemplateAd(); await flush();
    assert.deepEqual(instances[2].options, { adUnitId: "new-id" });
});

test("展示中的重复请求失败，销毁取消请求并隔离旧 Promise 与事件", async () => {
    const pending = [];
    const { ads, instances } = setup(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
    const result = [];
    const callback = { success: () => result.push("success"), fail: (code) => result.push(code) };
    ads.showNativeTemplateAd(undefined, callback);
    ads.showNativeTemplateAd(undefined, callback);
    assert.deepEqual(result, [-97003]);
    ads.destroyNativeTemplateAd();
    assert.deepEqual(result, [-97003, -97002]);
    ads.showNativeTemplateAd(undefined, callback);
    instances[0].callbacks.Error({ errCode: 99 });
    pending[0].reject({ errCode: 88 }); await flush();
    assert.equal(result.length, 2);
    pending[1].resolve(); await flush();
    assert.deepEqual(result, [-97003, -97002, "success"]);
});

test("宿主错误事件与 Promise 拒绝只结束一次请求并允许重试", async () => {
    let reject;
    const { ads, instances } = setup(() => new Promise((_, fail) => { reject = fail; }));
    const failures = []; const errors = [];
    ads.setNativeTemplateAdsListener({ onError: (code, message) => errors.push([code, message]) });
    ads.showNativeTemplateAd(undefined, { fail: (code, message) => failures.push([code, message]) });
    instances[0].callbacks.Error({ errCode: 1001, errMsg: "区域超出屏幕" });
    reject({ errCode: 1001, errMsg: "区域超出屏幕" }); await flush();
    assert.deepEqual(failures, [[1001, "区域超出屏幕"]]);
    assert.deepEqual(errors, failures);
    assert.equal(instances[0].destroyed, 1);
    ads.showNativeTemplateAd();
    assert.equal(instances.length, 2);
    ads.destroyNativeTemplateAd();
});

test("配置、宿主、创建和展示异常均明确失败", async () => {
    const ads = new OppoAds();
    let successes = 0; const failures = [];
    const callback = { success: () => successes++, fail: (code, message) => failures.push([code, message]) };
    delete globalThis.qg;
    ads.showNativeTemplateAd(undefined, callback);
    ads.init({ nativeTemplateAdId: "id" });
    ads.showNativeTemplateAd(undefined, callback);
    globalThis.qg = {};
    ads.showNativeTemplateAd(undefined, callback);
    globalThis.qg = { createCustomAd() { throw new Error("创建失败"); } };
    ads.showNativeTemplateAd(undefined, callback);
    const state = setup(() => { throw { code: "42", msg: "展示失败" }; });
    state.ads.showNativeTemplateAd(undefined, callback);
    const rejected = setup(() => Promise.reject({ errCode: 43, errMsg: "异步失败" }));
    rejected.ads.showNativeTemplateAd(undefined, callback); await flush();
    assert.equal(successes, 0);
    assert.equal(failures.length, 6);
    assert.deepEqual(failures.slice(-2), [[42, "展示失败"], [43, "异步失败"]]);
    assert.equal(state.instances[0].destroyed, 1);
});

test("非 OPPO 平台安全兜底并通知失败", () => {
    const ads = new BaseAds(); const results = [];
    ads.setNativeTemplateAdsListener({ onError: (code) => results.push(code) });
    ads.showNativeTemplateAd(undefined, { fail: (code) => results.push(code) });
    ads.hideNativeTemplateAd(); ads.destroyNativeTemplateAd();
    assert.equal(results.length, 2);
    assert.ok(results.every((code) => code < 0));
});

test("展示尚未完成时隐藏会取消请求，旧展示完成不会通知成功", async () => {
    let resolve;
    const { ads, instances } = setup(() => new Promise((done) => { resolve = done; }));
    const results = [];
    ads.showNativeTemplateAd(undefined, { success: () => results.push("success"), fail: (code) => results.push(code) });
    ads.hideNativeTemplateAd();
    resolve(); await flush();
    assert.deepEqual(results, [-97002]);
    assert.equal(instances[0].destroyed, 1);
});

test("隐藏失败释放实例，部分解绑失败也继续清理并允许重建", async () => {
    const { ads, instances } = setup();
    const errors = [];
    ads.setNativeTemplateAdsListener({ onError: (code, message) => errors.push([code, message]) });
    ads.showNativeTemplateAd(); await flush();
    instances[0].hide = () => { throw { errCode: 51, errMsg: "隐藏失败" }; };
    instances[0].offLoad = () => { throw new Error("解绑失败"); };
    ads.hideNativeTemplateAd();
    assert.deepEqual(errors, [[51, "隐藏失败"]]);
    assert.equal(instances[0].detached.length, 4);
    assert.equal(instances[0].destroyed, 1);
    ads.showNativeTemplateAd(); await flush();
    assert.equal(instances.length, 2);
    ads.destroyNativeTemplateAd();
});

test("展示成功回调可立即销毁并发起新请求", async () => {
    const { ads, instances } = setup();
    let successes = 0;
    ads.showNativeTemplateAd(undefined, { success() {
        successes++;
        ads.destroyNativeTemplateAd();
        ads.showNativeTemplateAd(undefined, { success: () => successes++ });
    } });
    await flush();
    assert.equal(successes, 2);
    assert.equal(instances.length, 2);
    assert.equal(instances[0].destroyed, 1);
    ads.destroyNativeTemplateAd();
});
