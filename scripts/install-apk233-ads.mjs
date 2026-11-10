import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const AAR_NAME = "mpg-cm-v1.1.1.aar";
const BRIDGE = "com.cygnat.apk233.Cygnat233AdsBridge";
const BRIDGE_FILE = "src/com/cygnat/apk233/Cygnat233AdsBridge.java";
const ACTIVITY_FILE = "src/com/cocos/game/AppActivity.java";
const STATE_FILE = ".cygnat-233-ads-install.json";
const KEEP_RULE = [
    "-keep class " + BRIDGE + " {",
    "    public static int getProtocolVersion();",
    "    public static boolean submit(java.lang.String);",
    "    public static java.lang.String drainEvents();",
    "}",
].join("\n");

const normalize = (value) => value.replaceAll("\r\n", "\n");
const lineEnding = (value) => value.includes("\r\n") ? "\r\n" : "\n";
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function optionalRead(file) {
    try {
        return await readFile(file);
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
}

async function assertLocalPath(project, file) {
    let current = project;
    for (const part of path.relative(project, file).split(path.sep)) {
        current = path.join(current, part);
        const stat = await lstat(current).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
        });
        if (!stat) return;
        if (stat.isSymbolicLink()) {
            throw new Error(path.relative(project, current) + " 是链接，无法确认当前渠道工程的接线范围");
        }
    }
}

function isAar(bytes) {
    const zipEnd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (zipEnd < 0 || zipEnd + 22 > bytes.length
        || zipEnd + 22 + bytes.readUInt16LE(zipEnd + 20) !== bytes.length
        || bytes.readUInt32LE(zipEnd + 4) !== 0) return false;

    const entries = bytes.readUInt16LE(zipEnd + 10);
    const required = new Set(["AndroidManifest.xml", "classes.jar"]);
    let offset = bytes.readUInt32LE(zipEnd + 16);
    if (offset + bytes.readUInt32LE(zipEnd + 12) !== zipEnd) return false;

    for (let index = 0; index < entries; index++) {
        if (offset + 46 > zipEnd || bytes.readUInt32LE(offset) !== 0x02014b50) return false;
        const nameStart = offset + 46;
        const nameEnd = nameStart + bytes.readUInt16LE(offset + 28);
        const next = nameEnd + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
        if (next > zipEnd) return false;
        const name = bytes.toString("utf8", nameStart, nameEnd);
        if (required.has(name)) {
            const localHeader = bytes.readUInt32LE(offset + 42);
            if (localHeader + 30 > zipEnd || bytes.readUInt32LE(localHeader) !== 0x04034b50
                || bytes.readUInt32LE(offset + 20) === 0) return false;
            required.delete(name);
        }
        offset = next;
    }
    return offset === zipEnd && required.size === 0;
}

async function writeAtomic(file, bytes) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = path.join(path.dirname(file), ".cygnat-233-" + randomUUID() + ".tmp");
    try {
        await writeFile(temporary, bytes, { flag: "wx" });
        await rename(temporary, file);
    } finally {
        await unlink(temporary).catch((error) => {
            if (error.code !== "ENOENT") throw error;
        });
    }
}

function maskComments(source, pattern = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g) {
    return source.replace(pattern, (comment) => comment.replace(/[^\r\n]/g, " "));
}

function wireActivity(source) {
    const newline = lineEnding(source);
    const code = maskComments(source);
    const hooks = [
        { method: "onCreate", hook: "attach", signature: "Bundle[ \\t]+(?<parameter>\\w+)", argument: "\\k<parameter>" },
        { method: "onDestroy", hook: "detach", signature: "", argument: "" },
    ];
    const inserts = [];

    for (const { method, hook, signature, argument } of hooks) {
        const calls = [...code.matchAll(new RegExp("Cygnat233AdsBridge\\." + hook + "\\s*\\(", "g"))];
        const managedCall = "(?:(?:com\\.cygnat\\.apk233\\.)?Cygnat233AdsBridge\\." + hook + "\\(this\\);\\s*)";
        const entry = new RegExp(
            "\\b(?:protected|public)\\s+void\\s+" + method + "\\s*\\(\\s*" + signature + "\\s*\\)\\s*\\{\\s*"
            + "(?<existing>" + managedCall + "?)"
            + "super\\." + method + "\\(\\s*" + argument + "\\s*\\);", "g",
        );
        const entries = [...code.matchAll(entry)];
        if (entries.length !== 1 || calls.length > 1 || Boolean(calls.length) !== Boolean(entries[0].groups.existing)) {
            throw new Error("AppActivity.java 的 " + method + " 与已知 Creator 模板冲突");
        }
        if (calls.length) {
            const qualified = code.slice(calls[0].index - "com.cygnat.apk233.".length, calls[0].index) === "com.cygnat.apk233.";
            if (!qualified && !/^\s*import\s+com\.cygnat\.apk233\.Cygnat233AdsBridge\s*;/m.test(code)) {
                throw new Error("AppActivity.java 的 " + method + " 引用了未知桥接类");
            }
            continue;
        }
        const entryMatch = entries[0];
        const index = entryMatch.index + entryMatch[0].lastIndexOf("super.");
        const indent = code.slice(code.lastIndexOf("\n", index - 1) + 1, index);
        if (!/^[\t ]+$/.test(indent)) throw new Error("AppActivity.java 的 " + method + " 接线位置无法确认");
        inserts.push({ index, text: BRIDGE + "." + hook + "(this);" + newline + indent });
    }

    for (const { index, text } of inserts.sort((left, right) => right.index - left.index)) {
        source = source.slice(0, index) + text + source.slice(index);
    }
    return source;
}

function wireManifest(source) {
    const newline = lineEnding(source);
    const code = maskComments(source, /<!--[\s\S]*?-->/g);
    const application = [...code.matchAll(/^[ \t]*<application(?=\s|>)/gm)];
    const queries = [...code.matchAll(/<queries(?=\s|>)[^>]*>[\s\S]*?<\/queries\s*>/g)];
    if (!/<manifest(?=\s|>)[^>]*>[\s\S]*<\/manifest\s*>/.test(code)
        || application.length !== 1 || !/<activity\b[^>]*\bandroid:name\s*=\s*["']com\.cocos\.game\.AppActivity["']/.test(code)
        || queries.length > 1 || (code.match(/<\/?queries\b/g) || []).length !== queries.length * 2) {
        throw new Error("AndroidManifest.xml 与已知 Creator 模板冲突");
    }

    const packageEntry = '<package android:name="com.meta.box" />';
    const permission = '    <uses-permission android:name="android.permission.INTERNET" />';
    const hasInternet = /<uses-permission\b[^>]*\bandroid:name\s*=\s*["']android\.permission\.INTERNET["']/.test(code);
    const inserts = [];
    const beforeApplication = [];
    if (!hasInternet) beforeApplication.push(permission);

    if (queries.length === 0) {
        beforeApplication.push("    <queries>", "        " + packageEntry, "    </queries>");
    } else if (!/<package\b[^>]*\bandroid:name\s*=\s*["']com\.meta\.box["']/.test(queries[0][0])) {
        const index = queries[0].index + queries[0][0].indexOf(">") + 1;
        const tail = source.slice(index);
        const ending = /^(?:\r\n|\n)/.test(tail) ? "" : newline + "    ";
        inserts.push({ index, text: newline + "        " + packageEntry + ending });
    }
    if (beforeApplication.length) {
        inserts.push({ index: application[0].index, text: beforeApplication.join(newline) + newline + newline });
    }
    for (const { index, text } of inserts.sort((left, right) => right.index - left.index)) {
        source = source.slice(0, index) + text + source.slice(index);
    }
    return source;
}

function wireGradle(source) {
    const code = maskComments(source);
    if (!/^\s*java\.srcDirs[^\r\n]*["']src["']/m.test(code)
        || !/^\s*manifest\.srcFile\s+["']AndroidManifest\.xml["']/m.test(code)
        || !/^\s*proguardFiles[^\r\n]*["']proguard-rules\.pro["']/m.test(code)) {
        throw new Error("build.gradle 的 Java、Manifest 或混淆规则路径与已知 Creator 模板冲突");
    }
    const otherAar = [...code.matchAll(/["']([^"'\r\n]*mpg-cm[^"'\r\n]*\.aar)["']/gi)]
        .find((match) => match[1] !== "libs/" + AAR_NAME);
    if (otherAar) throw new Error("build.gradle 已引用其他位置或版本的 233 AAR：" + otherAar[1]);
    const dependency = /^\s*implementation\s+files\s*\(\s*["']libs\/mpg-cm-v1\.1\.1\.aar["']\s*\)/m;
    const fileTree = /^\s*implementation\s+fileTree\(\s*dir:\s*["']libs["']\s*,\s*include:\s*\[[^\]\r\n]*["']\*\.aar["'][^\]\r\n]*\]\s*\)/m;
    if (dependency.test(code) || fileTree.test(code)) return source;
    const blocks = [...code.matchAll(/^dependencies\s*\{[ \t]*(?=\r?$)/gm)];
    if (blocks.length !== 1 || code.includes(AAR_NAME)) {
        throw new Error("build.gradle 的 dependencies 或 233 AAR 声明与已知 Creator 模板冲突");
    }
    const index = blocks[0].index + blocks[0][0].length;
    return source.slice(0, index) + lineEnding(source) + "    implementation files('libs/" + AAR_NAME + "')" + source.slice(index);
}

function wireProguard(source) {
    const code = normalize(maskComments(source, /#[^\r\n]*/g));
    const existing = code.match(/^[ \t]*-keep\s+(?:public\s+)?class\s+com\.cygnat\.apk233\.Cygnat233AdsBridge\s*\{[^}]*\}/m);
    if (existing) {
        const canonical = (value) => value.replace(/\s+/g, "");
        if (canonical(existing[0]) === canonical(KEEP_RULE)
            || /^-keep(?:public)?classcom\.cygnat\.apk233\.Cygnat233AdsBridge\{\*;\}$/.test(canonical(existing[0]))) {
            return source;
        }
        throw new Error("proguard-rules.pro 已存在不同的 233 桥接保留规则");
    }
    const newline = lineEnding(source);
    return source.trimEnd() + newline + newline + KEEP_RULE.replaceAll("\n", newline) + newline;
}

async function planInstallation(project, aarSource) {
    const app = path.join(project, "native", "engine", "android", "app");
    const changes = [];
    const pathInApp = (relative) => path.join(app, relative);
    const plan = (relative, previous, next) => {
        const bytes = Buffer.from(next);
        if (!previous?.equals(bytes)) changes.push({ relative, previous, bytes });
    };

    const template = [
        [ACTIVITY_FILE, wireActivity],
        ["build.gradle", wireGradle],
        ["AndroidManifest.xml", wireManifest],
        ["proguard-rules.pro", wireProguard],
    ];
    const libs = "libs/" + AAR_NAME;
    for (const relative of [...template.map(([file]) => file), libs, BRIDGE_FILE, STATE_FILE]) {
        await assertLocalPath(project, pathInApp(relative));
    }
    for (const [relative, wire] of template) {
        const previous = await optionalRead(pathInApp(relative));
        if (!previous) throw new Error("缺少 native/engine/android/app/" + relative + "，请先用 Creator 生成 Android 工程");
        plan(relative, previous, wire(previous.toString("utf8")));
    }

    const hostChanges = changes.splice(0);
    for (const directory of [pathInApp("libs"), path.join(app, "..", "libs")]) {
        const entries = await readdir(directory).catch((error) => {
            if (error.code === "ENOENT") return [];
            throw error;
        });
        const conflict = entries.find((entry) => /^mpg-cm.*\.aar$/i.test(entry)
            && (directory !== pathInApp("libs") || entry !== AAR_NAME));
        if (conflict) throw new Error("发现其他 233 AAR：" + path.join(directory, conflict));
    }
    const installedAar = await optionalRead(pathInApp(libs));
    const aar = aarSource ? await optionalRead(aarSource) : installedAar;
    if ((aarSource && path.basename(aarSource) !== AAR_NAME) || !aar || !isAar(aar)) {
        throw new Error("请通过 --aar 传入从 233 官方 SDK 解压的 AAR " + AAR_NAME);
    }
    if (installedAar && !installedAar.equals(aar)) throw new Error("app/libs 已存在内容不同的 " + AAR_NAME);
    plan(libs, installedAar, aar);

    const bridge = await readFile(new URL("../native/android-233/" + BRIDGE_FILE, import.meta.url));
    const installedBridge = await optionalRead(pathInApp(BRIDGE_FILE));
    const state = await optionalRead(pathInApp(STATE_FILE));
    const bridgeSha256 = hash(normalize(bridge.toString("utf8")));
    const installedHash = installedBridge ? hash(normalize(installedBridge.toString("utf8"))) : null;
    const aarSha256 = hash(aar);
    const previousState = state ? JSON.parse(state.toString("utf8")) : null;
    const previousHash = previousState?.bridgeSha256;
    if (state && (!/^[a-f0-9]{64}$/.test(previousHash ?? "") || previousState?.aarSha256 !== aarSha256)) {
        throw new Error(STATE_FILE + " 与现有桥接或 AAR 不匹配");
    }
    if (installedBridge && installedHash !== bridgeSha256 && installedHash !== previousHash) {
        throw new Error(BRIDGE_FILE + " 已存在手工修改，安装器保留原文件");
    }
    if (installedHash !== bridgeSha256) plan(BRIDGE_FILE, installedBridge, bridge);
    // 先安装依赖和桥接，再让宿主引用这些文件。
    changes.push(...hostChanges);
    plan(STATE_FILE, state, JSON.stringify({ bridgeSha256, aarSha256 }, null, 2) + "\n");
    return { app, changes };
}

async function main() {
    const { values } = parseArgs({
        options: {
            project: { type: "string" },
            aar: { type: "string" },
            check: { type: "boolean" },
            "dry-run": { type: "boolean" },
            apply: { type: "boolean" },
        },
    });
    const modes = [values.check, values["dry-run"], values.apply].filter(Boolean);
    if (!values.project || modes.length > 1) {
        throw new Error("用法：--project <Cocos 项目> [--aar <官方 AAR>] [--dry-run | --check | --apply]");
    }
    const project = await realpath(values.project);
    const { app, changes } = await planInstallation(project, values.aar);
    for (const change of changes) console.log("[233 APK] " + change.relative);
    if (!changes.length) {
        console.log("[233 APK] 已完成接线");
        return;
    }
    if (!values.apply) {
        if (!values["dry-run"]) process.exitCode = 1;
        return;
    }

    for (const { relative, previous } of changes) {
        const file = path.join(app, relative);
        await assertLocalPath(project, file);
        const current = await optionalRead(file);
        if (Boolean(previous) !== Boolean(current) || (previous && !previous.equals(current))) {
            throw new Error(relative + " 在检查后发生变化，请重新运行");
        }
    }
    for (const { relative, bytes } of changes) {
        const file = path.join(app, relative);
        await assertLocalPath(project, file);
        await writeAtomic(file, bytes);
    }
    console.log("[233 APK] 安装完成，可以继续编译 Android APK");
}

try {
    await main();
} catch (error) {
    console.error("[233 APK] " + error.message);
    process.exitCode = 2;
}
