import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();

async function loadCommon(relativePath, className, baseClassSource = "class BaseCommon {}") {
    const source = await readFile(path.join(root, relativePath), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{[^}]*\}\s*from\s*["']\.\.\/\.\.\/Core["'];?/,
            "const Log = () => undefined;\nconst Utils = {};\nconst Warn = () => undefined;",
        )
        .replace(
            /import\s*\{\s*BaseCommon\s*\}\s*from\s*["']\.\.\/Base\/BaseCommon["'];?/,
            baseClassSource,
        );
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`))[className];
}

test("BaseCommon exposes a no-op passive-share registration", async () => {
    const BaseCommon = await loadCommon("MiniGame/Base/BaseCommon.ts", "BaseCommon");
    const common = new BaseCommon();

    assert.doesNotThrow(() => common.onShareAppMessage(() => ({ title: "ignored" })));
});

test("WechatCommon forwards imageUrlId to active and passive share APIs", async () => {
    const WechatCommon = await loadCommon("MiniGame/wechat/WechatCommon.ts", "WechatCommon");
    let activeShare;
    let passiveShare;
    globalThis.wx = {
        shareAppMessage: (options) => { activeShare = options; },
        onShareAppMessage: (callback) => { passiveShare = callback; },
    };

    const common = Object.create(WechatCommon.prototype);
    common.shareAppMessage({ title: "active", imageUrlId: "approved-image" });
    common.onShareAppMessage(() => ({ title: "passive", imageUrlId: "approved-image" }));

    assert.equal(activeShare.imageUrlId, "approved-image");
    assert.equal(passiveShare().imageUrlId, "approved-image");
});

test("WechatCommon omits imageUrlId when callers do not supply it", async () => {
    const WechatCommon = await loadCommon("MiniGame/wechat/WechatCommon.ts", "WechatCommon");
    let activeShare;
    let passiveShare;
    globalThis.wx = {
        shareAppMessage: (options) => { activeShare = options; },
        onShareAppMessage: (callback) => { passiveShare = callback; },
    };

    const common = Object.create(WechatCommon.prototype);
    common.shareAppMessage({ title: "active" });
    common.onShareAppMessage(() => ({ title: "passive" }));

    assert.equal("imageUrlId" in activeShare, false);
    assert.equal("imageUrlId" in passiveShare(), false);
});

test("BytedanceCommon registers passive shares without imageUrlId", async () => {
    const BytedanceCommon = await loadCommon("MiniGame/bytedance/BytedanceCommon.ts", "BytedanceCommon");
    let passiveShare;
    globalThis.tt = {
        onShareAppMessage: (callback) => { passiveShare = callback; },
    };

    Object.create(BytedanceCommon.prototype).onShareAppMessage(() => ({ title: "tt", imageUrlId: "wx-only", query: "from=tt" }));

    assert.deepEqual(passiveShare({ channel: "" }), { title: "tt", desc: undefined, imageUrl: undefined, query: "from=tt" });
});

test("BilibiliCommon registers passive sharing when the API exists", async () => {
    const BilibiliCommon = await loadCommon("MiniGame/bilibili/BilibiliCommon.ts", "BilibiliCommon");
    let passiveShare;
    globalThis.bl = {
        onShareAppMessage: (callback) => { passiveShare = callback; },
    };

    Object.create(BilibiliCommon.prototype).onShareAppMessage(() => ({ title: "bl", imageUrlId: "wx-only" }));

    assert.deepEqual(passiveShare(), { title: "bl", desc: undefined, imageUrl: undefined, query: undefined });
});

test("BilibiliCommon tolerates a missing passive-share API", async () => {
    const BilibiliCommon = await loadCommon("MiniGame/bilibili/BilibiliCommon.ts", "BilibiliCommon");
    globalThis.bl = {};

    assert.doesNotThrow(() => Object.create(BilibiliCommon.prototype).onShareAppMessage(() => ({ title: "bl" })));
});

test("AlipayCommon maps passive sharing to its onShareAppMessage property", async () => {
    const AlipayCommon = await loadCommon("MiniGame/alipay/AlipayCommon.ts", "AlipayCommon");
    globalThis.my = {};

    Object.create(AlipayCommon.prototype).onShareAppMessage(() => ({ title: "my", imageUrlId: "wx-only" }));

    assert.deepEqual(globalThis.my.onShareAppMessage(), { title: "my", desc: undefined, imageUrl: undefined });
});
