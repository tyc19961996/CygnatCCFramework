import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import typescript from "typescript";

const sourcePath = path.join(process.cwd(), "MiniGame", "bytedance", "BytedanceCommon.ts");
const source = await readFile(sourcePath, "utf8");
const runtimeSource = source
    .replace(
        /import\s*\{[^}]*\}\s*from\s*["']\.\.\/\.\.\/Core["'];?/,
        "const Log = () => undefined;\nconst Utils = {};\nconst Warn = () => undefined;",
    )
    .replace(
        /import\s*\{\s*BaseCommon\s*\}\s*from\s*["']\.\.\/Base\/BaseCommon["'];?/,
        "class BaseCommon {}",
    );
const { outputText } = typescript.transpileModule(runtimeSource, {
    compilerOptions: {
        module: typescript.ModuleKind.ESNext,
        target: typescript.ScriptTarget.ES2019,
    },
});
const { BytedanceCommon } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);

const hadTt = Object.hasOwn(globalThis, "tt");
const previousTt = globalThis.tt;
const vibrations = [];

globalThis.tt = {
    getLaunchOptionsSync: () => ({}),
    vibrateShort: () => vibrations.push("short"),
    vibrateLong: () => vibrations.push("long"),
};

test.after(() => {
    if (hadTt) {
        globalThis.tt = previousTt;
    } else {
        delete globalThis.tt;
    }
});

test("vibrateShort triggers tt.vibrateShort", () => {
    vibrations.length = 0;

    new BytedanceCommon().vibrateShort();

    assert.deepEqual([...vibrations], ["short"]);
});

test("vibrateLong triggers tt.vibrateLong", () => {
    vibrations.length = 0;

    new BytedanceCommon().vibrateLong();

    assert.deepEqual([...vibrations], ["long"]);
});
