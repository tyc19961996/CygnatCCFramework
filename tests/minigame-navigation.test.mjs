import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();

async function loadCommon(file, className) {
    const source = await readFile(path.join(root, "MiniGame", file), "utf8");
    const runtimeSource = source.replace(/^import .*;\r?\n/gm, "");
    const { outputText } = typescript.transpileModule(
        `const Log = () => undefined;
        const Warn = () => undefined;
        const Utils = {};
        const Screen = { ScreenWidth: 0, ScreenHeight: 0 };
        class BaseCommon {}
        ${runtimeSource}`,
        { compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2019 } },
    );
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`))[className];
}

test("BaseCommon 对不支持的平台返回 false", async () => {
    const source = await readFile(path.join(root, "MiniGame/Base/BaseCommon.ts"), "utf8");
    const { outputText } = typescript.transpileModule(
        `const Screen = { ScreenWidth: 0, ScreenHeight: 0 };\n${source.replace(/^import .*;\r?\n/gm, "")}`,
        { compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2019 } },
    );
    const { BaseCommon } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);
    assert.equal(await new BaseCommon().navigateToMiniProgram({ appId: "target" }), false);
});

test("微信同步发起跳转并只转发微信字段", async () => {
    const WechatCommon = await loadCommon("wechat/WechatCommon.ts", "WechatCommon");
    let nativeOptions;
    globalThis.wx = { navigateToMiniProgram(options) { nativeOptions = options; } };
    const common = Object.create(WechatCommon.prototype);
    const result = common.navigateToMiniProgram({
        appId: "wx-target", path: "?from=game", extraData: { score: 7 },
        wechatEnvVersion: "trial", bilibiliVAppId: "bl-only", bytedanceEnvVersion: "latest",
    });
    assert.ok(nativeOptions, "宿主调用必须在返回 Promise 前发生");
    assert.deepEqual(Object.keys(nativeOptions).sort(), ["appId", "path", "extraData", "envVersion", "success", "fail"].sort());
    assert.equal(nativeOptions.envVersion, "trial");
    nativeOptions.success({ errMsg: "navigateToMiniProgram:ok" });
    assert.equal(await result, true);
    globalThis.wx = { navigateToMiniProgram(options) { options.fail({ errMsg: "fail cancel" }); } };
    assert.equal(await common.navigateToMiniProgram({ appId: "wx-target" }), false);
    globalThis.wx = {};
    assert.equal(await common.navigateToMiniProgram({ appId: "wx-target" }), false);
});

test("微信允许只传 shortLink 跳转，不补造 appId 或 path", async () => {
    const WechatCommon = await loadCommon("wechat/WechatCommon.ts", "WechatCommon");
    let nativeOptions;
    globalThis.wx = { navigateToMiniProgram(options) { nativeOptions = options; } };
    const result = Object.create(WechatCommon.prototype).navigateToMiniProgram({ shortLink: "https://wxaurl.cn/example" });
    assert.deepEqual(Object.keys(nativeOptions).sort(), ["shortLink", "success", "fail"].sort());
    assert.equal(nativeOptions.shortLink, "https://wxaurl.cn/example");
    nativeOptions.success({ errMsg: "navigateToMiniProgram:ok" });
    assert.equal(await result, true);
});

test("非微信平台不会把只有 shortLink 的请求交给宿主", async () => {
    const cases = [
        ["alipay/AlipayCommon.ts", "AlipayCommon", "my"],
        ["bilibili/BilibiliCommon.ts", "BilibiliCommon", "bl"],
        ["bytedance/BytedanceCommon.ts", "BytedanceCommon", "tt"],
    ];
    for (const [file, className, globalName] of cases) {
        const Common = await loadCommon(file, className);
        let called = false;
        globalThis[globalName] = { navigateToMiniProgram(options) { called = true; options.success({}); } };
        assert.equal(await Object.create(Common.prototype).navigateToMiniProgram({ shortLink: "https://wxaurl.cn/example" }), false, globalName);
        assert.equal(called, false, globalName);
    }
});

test("支付宝跳转复用宿主 API 并过滤平台专用字段", async () => {
    const AlipayCommon = await loadCommon("alipay/AlipayCommon.ts", "AlipayCommon");
    let nativeOptions;
    globalThis.my = { navigateToMiniProgram(options) { nativeOptions = options; options.success({}); } };
    const common = Object.create(AlipayCommon.prototype);
    assert.equal(await common.navigateToMiniProgram({ appId: "2021001234567890", path: "pages/home", extraData: { x: 1 }, wechatEnvVersion: "trial" }), true);
    assert.deepEqual(Object.keys(nativeOptions).sort(), ["appId", "path", "extraData", "success", "fail"].sort());
    globalThis.my = { navigateToMiniProgram(options) { options.fail({ error: 30, errorMessage: "denied" }); } };
    assert.equal(await common.navigateToMiniProgram({ appId: "2021001234567890" }), false);
    globalThis.my = {};
    assert.equal(await common.navigateToMiniProgram({ appId: "2021001234567890" }), false);
});

test("Bilibili 要求 vAppId 并传递对应版本", async () => {
    const BilibiliCommon = await loadCommon("bilibili/BilibiliCommon.ts", "BilibiliCommon");
    const common = Object.create(BilibiliCommon.prototype);
    let nativeOptions;
    globalThis.bl = { navigateToMiniProgram(options) { nativeOptions = options; options.success({}); } };
    assert.equal(await common.navigateToMiniProgram({ appId: "bl-target" }), false);
    assert.equal(nativeOptions, undefined);
    assert.equal(await common.navigateToMiniProgram({ appId: "bl-target", bilibiliVAppId: "v-target", bilibiliEnvVersion: "predev", path: "?from=game" }), true);
    assert.deepEqual(Object.keys(nativeOptions).sort(), ["appId", "vAppId", "envVersion", "path", "success", "fail"].sort());
    assert.equal(nativeOptions.vAppId, "v-target");
    globalThis.bl = { navigateToMiniProgram(options) { options.fail({ errMsg: "fail cancel" }); } };
    assert.equal(await common.navigateToMiniProgram({ appId: "bl-target", bilibiliVAppId: "v-target" }), false);
    globalThis.bl = {};
    assert.equal(await common.navigateToMiniProgram({ appId: "bl-target", bilibiliVAppId: "v-target" }), false);
});

test("抖音同步调用小游戏站跳转并使用平台版本值", async () => {
    const BytedanceCommon = await loadCommon("bytedance/BytedanceCommon.ts", "BytedanceCommon");
    const common = Object.create(BytedanceCommon.prototype);
    let nativeOptions;
    globalThis.tt = { navigateToMiniProgram(options) { nativeOptions = options; } };
    const result = common.navigateToMiniProgram({ appId: "tt-station", path: "pages/home", extraData: { x: 1 }, bytedanceEnvVersion: "latest", wechatEnvVersion: "trial" });
    assert.ok(nativeOptions, "宿主调用必须保留触摸事件的同步上下文");
    assert.deepEqual(Object.keys(nativeOptions).sort(), ["appId", "path", "extraData", "envVersion", "success", "fail"].sort());
    assert.equal(nativeOptions.envVersion, "latest");
    nativeOptions.success({ errMsg: "navigateToMiniProgram:ok" });
    assert.equal(await result, true);
    globalThis.tt = { navigateToMiniProgram(options) { options.fail({ errMsg: "fail cancel", errNo: 10502 }); } };
    assert.equal(await common.navigateToMiniProgram({ appId: "tt-station" }), false);
    globalThis.tt = {};
    assert.equal(await common.navigateToMiniProgram({ appId: "tt-station" }), false);
});

test("宿主跳转接口同步抛错时四个平台均返回 false", async () => {
    const cases = [
        ["wechat/WechatCommon.ts", "WechatCommon", "wx", { appId: "wx-target" }],
        ["alipay/AlipayCommon.ts", "AlipayCommon", "my", { appId: "2021001234567890" }],
        ["bilibili/BilibiliCommon.ts", "BilibiliCommon", "bl", { appId: "bl-target", bilibiliVAppId: "v-target" }],
        ["bytedance/BytedanceCommon.ts", "BytedanceCommon", "tt", { appId: "tt-station" }],
    ];
    for (const [file, className, globalName, options] of cases) {
        const Common = await loadCommon(file, className);
        globalThis[globalName] = { navigateToMiniProgram() { throw new Error("native error"); } };
        assert.equal(await Object.create(Common.prototype).navigateToMiniProgram(options), false, globalName);
    }
});
