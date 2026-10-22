import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import typescript from "typescript";

async function loadCommon(file, className) {
    const base = await readFile("MiniGame/Base/BaseCommon.ts", "utf8");
    const source = file ? await readFile(`MiniGame/${file}`, "utf8") : "";
    const stripImports = (text) => text.replace(/^import .*;\r?\n/gm, "");
    const { outputText } = typescript.transpileModule(
        `const Warn = () => undefined;
        const Screen = { ScreenWidth: 0, ScreenHeight: 0 };
        ${stripImports(base)}
        ${stripImports(source)}`,
        { compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2019 } },
    );
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`))[className];
}

for (const [file, className, hostName] of [
    ["wechat/WechatCommon.ts", "WechatCommon", "wx"],
    ["alipay/AlipayCommon.ts", "AlipayCommon", "my"],
    ["bilibili/BilibiliCommon.ts", "BilibiliCommon", "bl"],
    ["kuaishou/KuaiShouCommon.ts", "KuaiShouCommon", "ks"],
    ["bytedance/BytedanceCommon.ts", "BytedanceCommon", "tt"],
    ["oppo/OppoCommon.ts", "OppoCommon", "qg"],
]) {
    test(`${className} 返回宿主原始系统信息并复用缓存`, async (t) => {
        const Common = await loadCommon(file, className);
        const previous = Object.getOwnPropertyDescriptor(globalThis, hostName);
        t.after(() => {
            if (previous) Object.defineProperty(globalThis, hostName, previous);
            else delete globalThis[hostName];
        });
        const info = { screenWidth: 1080, screenHeight: 1920, platform: "android", nativeField: "宿主扩展" };
        let calls = 0;
        globalThis[hostName] = { getSystemInfoSync() { calls++; return info; } };
        // 绕过与本接口无关的宿主事件注册，只执行真实取值方法。
        const common = Object.create(Common.prototype);
        assert.equal(common.getSystemInfo(), info);
        assert.equal(common.getSystemInfo(), info);
        assert.equal(calls, 1);
    });
}

test("基类和鸿蒙在没有系统信息桥接时返回 null", async () => {
    const BaseCommon = await loadCommon(null, "BaseCommon");
    const HarmonyCommon = await loadCommon("harmony/HarmonyCommon.ts", "HarmonyCommon");
    assert.equal(new BaseCommon().getSystemInfo(), null);
    assert.equal(new HarmonyCommon().getSystemInfo(), null);
});
