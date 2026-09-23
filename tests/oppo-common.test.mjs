import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const root = process.cwd();

async function loadCommon() {
    const source = await readFile(path.join(root, "MiniGame", "oppo", "OppoCommon.ts"), "utf8");
    const runtimeSource = source
        .replace(
            /import\s*\{[^}]*\}\s*from\s*["']\.\.\/\.\.\/Core["'];?/,
            "const Log = () => undefined;\nconst Warn = () => undefined;",
        )
        .replace(
            /import\s*\{\s*BaseCommon\s*\}\s*from\s*["']\.\.\/Base\/BaseCommon["'];?/,
            `class BaseCommon {
                constructor() {
                    this._hotLaunchOptions = {};
                    this.notifications = [];
                }
                getHotLaunchOptions() { return this._hotLaunchOptions; }
                _notifyOnShow(options) { this._hotLaunchOptions = options; this.notifications.push(options); }
            }`,
        );
    const { outputText } = typescript.transpileModule(runtimeSource, {
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return (await import(`data:text/javascript,${encodeURIComponent(outputText)}`)).OppoCommon;
}

const OppoCommon = await loadCommon();
const hadQG = Object.hasOwn(globalThis, "qg");
const previousQG = globalThis.qg;

test.after(() => {
    if (hadQG) globalThis.qg = previousQG;
    else delete globalThis.qg;
});

test("OppoCommon maps qg.login token and user fields", async () => {
    globalThis.qg = {
        getLaunchOptionsSync: () => ({}),
        login: ({ success }) => success({
            data: {
                token: "oppo-token",
                uid: "uid-1",
                nickName: "玩家",
                avatar: "avatar-url",
                code: "optional-code",
            },
        }),
    };

    const result = await new OppoCommon().login();

    assert.deepEqual(result, {
        success: true,
        code: "optional-code",
        token: "oppo-token",
        uid: "uid-1",
        nickName: "玩家",
        avatar: "avatar-url",
    });
});

test("OppoCommon normalizes qg.login failure", async () => {
    globalThis.qg = {
        getLaunchOptionsSync: () => ({}),
        login: ({ fail }) => fail({ errCode: 401, errMsg: "login failed" }),
    };

    const result = await new OppoCommon().login();

    assert.equal(result.success, false);
    assert.equal(result.errCode, 401);
    assert.equal(result.errMsg, "login failed");
});

test("OppoCommon exposes system info and forwards onShow", () => {
    let onShow;
    globalThis.qg = {
        getLaunchOptionsSync: () => ({ query: { source: "cold" } }),
        onShow: (callback) => { onShow = callback; },
        getSystemInfoSync: () => ({
            platform: "android",
            platformVersionCode: 1165,
            platformVersionName: "11.6.5",
            screenWidth: 1080,
            screenHeight: 1920,
        }),
    };

    const common = new OppoCommon();
    assert.equal(common.getPlatform(), "android");
    assert.equal(common.getLibVersion(), "1165");
    assert.equal(common.getHostVersion(), "11.6.5");
    assert.deepEqual(common.getScreenSize(), { width: 1080, height: 1920 });

    const hotOptions = { query: { source: "hot" } };
    onShow(hotOptions);
    assert.deepEqual(common.getHotLaunchOptions(), hotOptions);
    assert.deepEqual(common.notifications, [hotOptions]);
});
