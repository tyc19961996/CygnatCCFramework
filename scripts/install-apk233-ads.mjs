import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const AAR_NAME = "mpg-cm-v1.1.1.aar";
const LOGIN_AAR_NAME = "mpg-pay-v3.2.24.aar";
const BRIDGE = "com.cygnat.apk233.Cygnat233AdsBridge";
const ACCOUNT_BRIDGE = "com.cygnat.apk233.Cygnat233AccountBridge";
const BRIDGE_FILE = "src/com/cygnat/apk233/Cygnat233AdsBridge.java";
const ACCOUNT_BRIDGE_FILE = "src/com/cygnat/apk233/Cygnat233AccountBridge.java";
const ACTIVITY_FILE = "src/com/cocos/game/AppActivity.java";
const STATE_FILE = ".cygnat-233-ads-install.json";
const KEEP_RULE = [
    "-keep class " + BRIDGE + " {",
    "    public static int getProtocolVersion();",
    "    public static boolean submit(java.lang.String);",
    "    public static java.lang.String drainEvents();",
    "}",
].join("\n");
const KEEP_ACCOUNT_RULE = KEEP_RULE.replace(BRIDGE, ACCOUNT_BRIDGE);
const LOGIN_RULES = [
    "-keep class com.meta.android.mpg.** { *; }",
    "-keep class com.meta.sdk.open.** { *; }",
    "-keep class com.meta.android.thirdpart.** { *; }",
    "-keep class com.alibaba.sdk.android.oss.** { *; }",
    "-keepattributes Signature,*Annotation*",
    "-dontwarn org.apache.**",
];
const LOGIN_DEPENDENCIES = [
    ["androidx.appcompat:appcompat", "1.6.1"],
    ["com.github.bumptech.glide:glide", "4.16.0"],
    ["com.alipay.sdk:alipaysdk-android", "15.8.42"],
];

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

function wireActivity(source, withLogin) {
    const newline = lineEnding(source);
    const code = maskComments(source);
    const hooks = [
        { method: "onCreate", hook: "attach", signature: "Bundle[ \\t]+(?<parameter>\\w+)", argument: "\\k<parameter>" },
        { method: "onDestroy", hook: "detach", signature: "", argument: "" },
    ];
    const inserts = [];

    const bridges = withLogin ? [BRIDGE, ACCOUNT_BRIDGE] : [BRIDGE];
    const names = bridges.map((bridge) => bridge.split(".").at(-1));
    for (const { method, hook, signature, argument } of hooks) {
        const managedCall = "(?:(?:com\\.cygnat\\.apk233\\.)?(?:" + names.join("|") + ")\\." + hook + "\\(this\\);\\s*)";
        const entry = new RegExp(
            "\\b(?:protected|public)\\s+void\\s+" + method + "\\s*\\(\\s*" + signature + "\\s*\\)\\s*\\{\\s*"
            + "(?<existing>" + managedCall + "*)"
            + "super\\." + method + "\\(\\s*" + argument + "\\s*\\);", "g",
        );
        const entries = [...code.matchAll(entry)];
        if (entries.length !== 1) {
            throw new Error("AppActivity.java 的 " + method + " 与已知 Creator 模板冲突");
        }
        const entryMatch = entries[0];
        const missing = [];
        for (const [bridgeIndex, name] of names.entries()) {
            const bridge = bridges[bridgeIndex];
            const calls = [...code.matchAll(new RegExp(name + "\\." + hook + "\\s*\\(", "g"))];
            if (calls.length > 1 || Boolean(calls.length) !== entryMatch.groups.existing.includes(name + "." + hook)) {
                throw new Error("AppActivity.java 的 " + method + " 与已知 Creator 模板冲突");
            }
            if (!calls.length) {
                missing.push(bridge + "." + hook + "(this);");
                continue;
            }
            const prefix = "com.cygnat.apk233.";
            const qualified = code.slice(calls[0].index - prefix.length, calls[0].index) === prefix;
            const imported = new RegExp("^\\s*import\\s+" + bridge.replaceAll(".", "\\.") + "\\s*;", "m");
            if (!qualified && !imported.test(code)) {
                throw new Error("AppActivity.java 的 " + method + " 引用了未知桥接类");
            }
        }
        if (!missing.length) continue;
        const index = entryMatch.index + entryMatch[0].lastIndexOf("super.");
        const indent = code.slice(code.lastIndexOf("\n", index - 1) + 1, index);
        if (!/^[\t ]+$/.test(indent)) throw new Error("AppActivity.java 的 " + method + " 接线位置无法确认");
        inserts.push({ index, text: missing.join(newline + indent) + newline + indent });
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

function wireGradle(source, withLogin) {
    const code = maskComments(source);
    if (!/^\s*java\.srcDirs[^\r\n]*["']src["']/m.test(code)
        || !/^\s*manifest\.srcFile\s+["']AndroidManifest\.xml["']/m.test(code)
        || !/^\s*proguardFiles[^\r\n]*["']proguard-rules\.pro["']/m.test(code)) {
        throw new Error("build.gradle 的 Java、Manifest 或混淆规则路径与已知 Creator 模板冲突");
    }
    const fileTree = /^\s*implementation\s+fileTree\(\s*dir:\s*["']libs["']\s*,\s*include:\s*\[[^\]\r\n]*["']\*\.aar["'][^\]\r\n]*\]\s*\)/m;
    const aars = withLogin ? [AAR_NAME, LOGIN_AAR_NAME] : [AAR_NAME];
    const additions = [];
    for (const name of aars) {
        const prefix = name === AAR_NAME ? "mpg-cm" : "mpg-pay";
        const otherAar = [...code.matchAll(new RegExp("[\"']([^\"'\\r\\n]*" + prefix + "[^\"'\\r\\n]*\\.aar)[\"']", "gi"))]
            .find((match) => match[1] !== "libs/" + name);
        if (otherAar) throw new Error("build.gradle 已引用其他位置或版本的 233 AAR：" + otherAar[1]);
        const dependency = new RegExp("^\\s*implementation\\s+files\\s*\\(\\s*[\"']libs/" + name.replaceAll(".", "\\.") + "[\"']\\s*\\)", "m");
        if (dependency.test(code) || fileTree.test(code)) continue;
        if (code.includes(name)) throw new Error("build.gradle 的 233 AAR 声明与已知 Creator 模板冲突");
        additions.push("    implementation files('libs/" + name + "')");
    }
    if (withLogin) {
        for (const [artifact, version] of LOGIN_DEPENDENCIES) {
            if (!code.includes(artifact + ":")) additions.push("    implementation '" + artifact + ":" + version + "'");
        }
    }
    if (!additions.length) return source;
    const blocks = [...code.matchAll(/^dependencies\s*\{[ \t]*(?=\r?$)/gm)];
    if (blocks.length !== 1) throw new Error("build.gradle 的 dependencies 与已知 Creator 模板冲突");
    const index = blocks[0].index + blocks[0][0].length;
    const newline = lineEnding(source);
    return source.slice(0, index) + newline + additions.join(newline) + source.slice(index);
}

function wireJetifier(source) {
    const property = /^[ \t]*android\.enableJetifier(?:[ \t]*[=:]|[ \t]+)[^\r\n]*(?=\r?$)/gm;
    const matches = [...source.matchAll(property)];
    if (matches.length > 1) throw new Error("gradle.properties 已存在重复的 android.enableJetifier");
    if (matches.length) return source.replace(property, "android.enableJetifier=true");
    const newline = lineEnding(source);
    return source.trimEnd() + newline + "android.enableJetifier=true" + newline;
}

function wireProguard(source, withLogin) {
    const code = normalize(maskComments(source, /#[^\r\n]*/g));
    const canonical = (value) => value.replace(/\s+/g, "");
    const bridges = withLogin ? [[BRIDGE, KEEP_RULE], [ACCOUNT_BRIDGE, KEEP_ACCOUNT_RULE]] : [[BRIDGE, KEEP_RULE]];
    const additions = [];
    for (const [bridge, rule] of bridges) {
        const existing = code.match(new RegExp(
            "^[ \\t]*-keep\\s+(?:public\\s+)?class\\s+" + bridge.replaceAll(".", "\\.") + "\\s*\\{[^}]*\\}", "m",
        ));
        if (!existing) {
            additions.push(rule);
        } else if (canonical(existing[0]) !== canonical(rule)
            && canonical(existing[0]).replace("publicclass", "class") !== "-keepclass" + bridge + "{*;}") {
            throw new Error("proguard-rules.pro 已存在不同的 233 桥接保留规则");
        }
    }
    if (withLogin) additions.push(...LOGIN_RULES.filter((rule) => !canonical(code).includes(canonical(rule))));
    if (!additions.length) return source;
    const newline = lineEnding(source);
    return source.trimEnd() + newline + newline + additions.join("\n").replaceAll("\n", newline) + newline;
}

async function planInstallation(project, aarSource, loginAarSource) {
    const app = path.join(project, "native", "engine", "android", "app");
    const changes = [];
    const pathInApp = (relative) => path.join(app, relative);
    const plan = (relative, previous, next, file = pathInApp(relative)) => {
        const bytes = Buffer.from(next);
        if (!previous?.equals(bytes)) changes.push({ relative, file, previous, bytes });
    };
    const safeRead = async (file) => {
        await assertLocalPath(project, file);
        return optionalRead(file);
    };
    const state = await safeRead(pathInApp(STATE_FILE));
    const previousState = state ? JSON.parse(state.toString("utf8")) : null;
    if (state && (!previousState || typeof previousState !== "object")) {
        throw new Error(STATE_FILE + " 的安装记录无效");
    }
    const loginInstalled = await safeRead(pathInApp("libs/" + LOGIN_AAR_NAME));
    const withLogin = Boolean(loginAarSource || loginInstalled || previousState?.account);

    const template = [
        [ACTIVITY_FILE, wireActivity],
        ["build.gradle", wireGradle],
        ["AndroidManifest.xml", wireManifest],
        ["proguard-rules.pro", wireProguard],
    ];
    for (const [relative, wire] of template) {
        const previous = await safeRead(pathInApp(relative));
        if (!previous) throw new Error("缺少 native/engine/android/app/" + relative + "，请先用 Creator 生成 Android 工程");
        plan(relative, previous, wire(previous.toString("utf8"), withLogin));
    }
    if (withLogin) {
        const relative = "build/android/proj/gradle.properties";
        const file = path.join(project, relative);
        const properties = await safeRead(file);
        if (properties) plan(relative, properties, wireJetifier(properties.toString("utf8")), file);
    }

    const hostChanges = changes.splice(0);
    const libDirectories = [pathInApp("libs"), path.join(app, "..", "libs")];
    const libraryEntries = await Promise.all(libDirectories.map(async (directory) => {
        await assertLocalPath(project, directory);
        return readdir(directory).catch((error) => {
            if (error.code === "ENOENT") return [];
            throw error;
        });
    }));

    async function installSdk(name, prefix, option, source, bridgeFile, prior) {
        const libs = "libs/" + name;
        const pattern = new RegExp("^" + prefix + ".*\\.aar$", "i");
        for (const [index, entries] of libraryEntries.entries()) {
            const conflict = entries.find((entry) => pattern.test(entry) && (index !== 0 || entry !== name));
            if (conflict) throw new Error("发现其他 233 AAR：" + path.join(libDirectories[index], conflict));
        }
        const installedAar = await safeRead(pathInApp(libs));
        const aar = source ? await optionalRead(source) : installedAar;
        if ((source && path.basename(source) !== name) || !aar || !isAar(aar)) {
            throw new Error("请通过 " + option + " 传入从 233 官方 SDK 解压的 AAR " + name);
        }
        if (installedAar && !installedAar.equals(aar)) throw new Error("app/libs 已存在内容不同的 " + name);
        plan(libs, installedAar, aar);

        const bridge = await readFile(new URL("../native/android-233/" + bridgeFile, import.meta.url));
        const installedBridge = await safeRead(pathInApp(bridgeFile));
        const bridgeSha256 = hash(normalize(bridge.toString("utf8")));
        const installedHash = installedBridge ? hash(normalize(installedBridge.toString("utf8"))) : null;
        const aarSha256 = hash(aar);
        if (prior && (!/^[a-f0-9]{64}$/.test(prior.bridgeSha256 ?? "") || prior.aarSha256 !== aarSha256)) {
            throw new Error(STATE_FILE + " 与现有桥接或 AAR 不匹配");
        }
        if (installedBridge && installedHash !== bridgeSha256 && installedHash !== prior?.bridgeSha256) {
            throw new Error(bridgeFile + " 已存在手工修改，安装器保留原文件");
        }
        if (installedHash !== bridgeSha256) plan(bridgeFile, installedBridge, bridge);
        return { bridgeSha256, aarSha256 };
    }

    const nextState = await installSdk(AAR_NAME, "mpg-cm", "--aar", aarSource, BRIDGE_FILE, previousState);
    if (withLogin) {
        nextState.account = await installSdk(LOGIN_AAR_NAME, "mpg-pay", "--login-aar", loginAarSource,
            ACCOUNT_BRIDGE_FILE, previousState?.account);
    }

    // 先安装依赖和桥接，再让宿主引用这些文件。
    changes.push(...hostChanges);
    plan(STATE_FILE, state, JSON.stringify(nextState, null, 2) + "\n");
    return changes;
}
async function main() {
    const { values } = parseArgs({
        options: {
            project: { type: "string" },
            aar: { type: "string" },
            "login-aar": { type: "string" },
            check: { type: "boolean" },
            "dry-run": { type: "boolean" },
            apply: { type: "boolean" },
        },
    });
    const modes = [values.check, values["dry-run"], values.apply].filter(Boolean);
    if (!values.project || modes.length > 1) {
        throw new Error("用法：--project <Cocos 项目> [--aar <广告 AAR>] [--login-aar <登录 AAR>] [--dry-run | --check | --apply]");
    }
    const project = await realpath(values.project);
    const changes = await planInstallation(project, values.aar, values["login-aar"]);
    for (const change of changes) console.log("[233 APK] " + change.relative);
    if (!changes.length) {
        console.log("[233 APK] 已完成接线");
        return;
    }
    if (!values.apply) {
        if (!values["dry-run"]) process.exitCode = 1;
        return;
    }

    for (const { relative, file, previous } of changes) {
        await assertLocalPath(project, file);
        const current = await optionalRead(file);
        if (Boolean(previous) !== Boolean(current) || (previous && !previous.equals(current))) {
            throw new Error(relative + " 在检查后发生变化，请重新运行");
        }
    }
    for (const { file, bytes } of changes) {
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
