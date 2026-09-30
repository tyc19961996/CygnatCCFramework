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
        `const Warn = () => undefined;
        const Screen = { ScreenWidth: 0, ScreenHeight: 0 };
        class BaseCommon {}
        ${runtimeSource}`,
        { compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2019 } },
    );
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`))[className];
}

test("微信创建开放页面管理器并保留宿主实例的完整生命周期", async () => {
    const WechatCommon = await loadCommon("wechat/WechatCommon.ts", "WechatCommon");
    const calls = [];
    const listener = () => undefined;
    const nativeManager = {
        load(options) { calls.push(["load", options]); return Promise.resolve({ loaded: true }); },
        show(options) { calls.push(["show", options]); return Promise.resolve({ shown: true }); },
        on(name, callback) { calls.push(["on", name, callback]); },
        off(name, callback) { calls.push(["off", name, callback]); },
        destroy() { calls.push(["destroy"]); },
    };
    let createCount = 0;
    globalThis.wx = { createPageManager() { createCount++; return nativeManager; } };

    const manager = Object.create(WechatCommon.prototype).createPageManager();
    assert.equal(createCount, 1, "工厂应同步调用宿主 API");
    assert.equal(manager, nativeManager, "返回宿主原实例以保留渠道专用能力");
    assert.deepEqual(await manager.load({ openlink: "wx-openlink", query: { id: "123" }, extraData: { source: "game" } }), { loaded: true });
    assert.deepEqual(await manager.show(), { shown: true });
    manager.on("onClose", listener);
    manager.off("onClose", listener);
    manager.destroy();
    assert.deepEqual(calls, [
        ["load", { openlink: "wx-openlink", query: { id: "123" }, extraData: { source: "game" } }],
        ["show", undefined],
        ["on", "onClose", listener],
        ["off", "onClose", listener],
        ["destroy"],
    ]);
});

test("微信宿主 API 缺失或同步抛错时返回 null", async () => {
    const WechatCommon = await loadCommon("wechat/WechatCommon.ts", "WechatCommon");
    const common = Object.create(WechatCommon.prototype);
    globalThis.wx = {};
    assert.equal(common.createPageManager(), null);
    globalThis.wx = { createPageManager() { throw new Error("native error"); } };
    assert.equal(common.createPageManager(), null);
});

test("其他平台通过 BaseCommon 返回 null", async () => {
    const source = await readFile(path.join(root, "MiniGame/Base/BaseCommon.ts"), "utf8");
    const { outputText } = typescript.transpileModule(
        `const Screen = { ScreenWidth: 0, ScreenHeight: 0 };\n${source.replace(/^import .*;\r?\n/gm, "")}`,
        { compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2019 } },
    );
    const { BaseCommon } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);
    assert.equal(new BaseCommon().createPageManager(), null);
});
