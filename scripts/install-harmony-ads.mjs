#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
    cp,
    mkdir,
    readFile,
    readdir,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accountPatches, analyzeAccountMetadata, resolveAccountAbility } from "./harmony-account-installation.mjs";

const INSTALLER_VERSION = 1;
const PROTOCOL_VERSION = 1;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SOURCE_LIBRARY = path.join(
    REPOSITORY_ROOT,
    "native",
    "harmonyos-next",
    "cygnat-harmony-ads",
);
const SOURCE_BRIDGE = path.join(
    REPOSITORY_ROOT,
    "native",
    "harmonyos-next",
    "glue",
    "CygnatHarmonyAdsBridge.ets",
);

const HOST_FILES = {
    rootBuild: path.join("native", "engine", "harmonyos-next", "build-profile.json5"),
    package: path.join("native", "engine", "harmonyos-next", "entry", "oh-package.json5"),
    build: path.join("native", "engine", "harmonyos-next", "entry", "build-profile.json5"),
    page: path.join(
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "src",
        "main",
        "ets",
        "pages",
        "index.ets",
    ),
    worker: path.join(
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "src",
        "main",
        "ets",
        "workers",
        "cocos_worker.ts",
    ),
};

const PATCHES = {
    rootBuild: [{
        name: "Harmony HAR 根模块",
        marker: "root-module",
        anchor: '  "modules": [',
        position: "after",
        forbidden: ['"name": "cygnat_harmony_ads"', "../../extensions/cygnat-harmony-ads"],
        block: [
            "    // <cygnat-harmony-ads:root-module>",
            "    {",
            '      "name": "cygnat_harmony_ads",',
            '      "srcPath": "../../extensions/cygnat-harmony-ads",',
            '      "targets": [',
            "        {",
            '          "name": "default",',
            '          "applyToProducts": [',
            '            "default"',
            "          ]",
            "        }",
            "      ]",
            "    },",
            "    // </cygnat-harmony-ads:root-module>",
        ].join("\n"),
    }],
    package: [{
        name: "entry 依赖",
        marker: "dependency",
        anchor: '  "dependencies": {',
        position: "after",
        forbidden: ['"@cygnat/harmony-ads"'],
        block: [
            "    // <cygnat-harmony-ads:dependency>",
            '    "@cygnat/harmony-ads": "file:../../../extensions/cygnat-harmony-ads",',
            "    // </cygnat-harmony-ads:dependency>",
        ].join("\n"),
    }],
    build: [{
        name: "runtimeOnly 配置",
        marker: "runtime-only",
        anchor: "  buildOption: {",
        position: "after",
        forbidden: ["arkOptions", "runtimeOnly", "CygnatHarmonyAdsBridge.ets"],
        adoptEquivalent: "harmony-runtime-only",
        block: [
            "    // <cygnat-harmony-ads:runtime-only>",
            "    arkOptions: {",
            "      runtimeOnly: {",
            "        sources: [",
            "          './src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets'",
            "        ]",
            "      }",
            "    },",
            "    // </cygnat-harmony-ads:runtime-only>",
        ].join("\n"),
    }],
    page: [
        {
            name: "UI 导入",
            marker: "page-import",
            anchor: "import { PortProxy } from '../common/PortProxy';",
            position: "after",
            forbidden: ["handleHarmonyAdRequest"],
            block: [
                "// <cygnat-harmony-ads:page-import>",
                "import { disposeHarmonyAds, handleHarmonyAdRequest } from '@cygnat/harmony-ads';",
                "// </cygnat-harmony-ads:page-import>",
            ].join("\n"),
            legacyBlocks: [[
                "// <cygnat-harmony-ads:page-import>",
                "import { handleHarmonyAdRequest } from '@cygnat/harmony-ads';",
                "// </cygnat-harmony-ads:page-import>",
            ].join("\n")],
        },
        {
            name: "UI 消息分支",
            marker: "page-case",
            anchor: '        case "exitGame": {',
            position: "before",
            forbidden: ["cygnatAdsRequest"],
            block: [
                "        // <cygnat-harmony-ads:page-case>",
                '        case "cygnatAdsRequest": {',
                "          handleHarmonyAdRequest(",
                "            getContext(this) as common.UIAbilityContext,",
                "            msg.param as string,",
                "            (eventJson: string): void => {",
                '              this.workPort.postMessage("cygnatAdsEvent", eventJson);',
                "            }",
                "          );",
                "          break;",
                "        }",
                "        // </cygnat-harmony-ads:page-case>",
            ].join("\n"),
        },
        {
            name: "UI 销毁清理",
            marker: "page-dispose",
            anchor: "  aboutToDisappear(): void {",
            position: "after",
            forbidden: ["disposeHarmonyAds()"],
            block: [
                "    // <cygnat-harmony-ads:page-dispose>",
                "    disposeHarmonyAds();",
                "    // </cygnat-harmony-ads:page-dispose>",
            ].join("\n"),
        },
    ],
    worker: [
        {
            name: "Worker 导入",
            marker: "worker-import",
            anchor: "import { PortProxy } from '../common/PortProxy';",
            position: "after",
            forbidden: ["configureHarmonyAdsWorker", "enqueueHarmonyAdEvent"],
            block: [
                "// <cygnat-harmony-ads:worker-import>",
                "import { configureHarmonyAdsWorker, enqueueHarmonyAdEvent } from '@cygnat/harmony-ads/Worker';",
                "// </cygnat-harmony-ads:worker-import>",
            ].join("\n"),
            legacyBlocks: [[
                "// <cygnat-harmony-ads:worker-import>",
                "import { configureHarmonyAdsWorker, enqueueHarmonyAdEvent } from '@cygnat/harmony-ads';",
                "// </cygnat-harmony-ads:worker-import>",
            ].join("\n")],
        },
        {
            name: "Worker 发送配置",
            marker: "worker-setup",
            anchor: "let uiPort = new PortProxy(worker.workerPort);",
            position: "after",
            forbidden: ["cygnatAdsRequest"],
            block: [
                "// <cygnat-harmony-ads:worker-setup>",
                "configureHarmonyAdsWorker((requestJson: string): void => {",
                '  uiPort.postMessage("cygnatAdsRequest", requestJson);',
                "});",
                "// </cygnat-harmony-ads:worker-setup>",
            ].join("\n"),
        },
        {
            name: "Worker 事件分支",
            marker: "worker-case",
            anchor: '    case "backPress":',
            position: "before",
            forbidden: ["cygnatAdsEvent"],
            block: [
                "    // <cygnat-harmony-ads:worker-case>",
                '    case "cygnatAdsEvent":',
                "      enqueueHarmonyAdEvent(msg.param as string);",
                "      break;",
                "    // </cygnat-harmony-ads:worker-case>",
            ].join("\n"),
        },
    ],
};

async function pathExists(target) {
    try {
        await stat(target);
        return true;
    } catch (error) {
        if (error && error.code === "ENOENT") return false;
        throw error;
    }
}

function countOccurrences(text, token) {
    let count = 0;
    let offset = 0;
    while (true) {
        const index = text.indexOf(token, offset);
        if (index < 0) return count;
        count++;
        offset = index + token.length;
    }
}

function scanJson5Code(text, start, end, visit) {
    let quote = "";
    for (let index = start; index < end; index++) {
        const character = text[index];
        const next = text[index + 1];
        if (quote) {
            if (character === "\\") {
                index++;
            } else if (character === quote) {
                quote = "";
            }
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }
        if (character === "/" && next === "/") {
            const newline = text.indexOf("\n", index + 2);
            if (newline < 0 || newline >= end) return false;
            index = newline;
            continue;
        }
        if (character === "/" && next === "*") {
            const closing = text.indexOf("*/", index + 2);
            if (closing < 0 || closing + 2 > end) return false;
            index = closing + 1;
            continue;
        }
        if (visit(character, index) === false) return false;
    }
    return quote === "";
}

function findClosingObjectBrace(text, openIndex) {
    let depth = 0;
    let closing = -1;
    scanJson5Code(text, openIndex, text.length, (character, index) => {
        if (character === "{") {
            depth++;
        } else if (character === "}") {
            depth--;
            if (depth === 0) {
                closing = index;
                return false;
            }
            if (depth < 0) return false;
        }
        return true;
    });
    return closing;
}

function isDirectObjectProperty(text, openIndex, propertyIndex) {
    let depth = 0;
    const complete = scanJson5Code(text, openIndex, propertyIndex, (character) => {
        if (character === "{") {
            depth++;
        } else if (character === "}") {
            depth--;
        }
        return depth >= 0;
    });
    return complete && depth === 1;
}

function findNextJson5CodeToken(text, start, end) {
    let tokenIndex = -1;
    scanJson5Code(text, start, end, (character, index) => {
        if (/\s/.test(character)) return true;
        tokenIndex = index;
        return false;
    });
    return tokenIndex;
}

function findDirectObjectProperties(text, openIndex, closingIndex, propertyName) {
    const pattern = new RegExp(
        `(?:"${propertyName}"|'${propertyName}'|\\b${propertyName}\\b)[ \\t\\r\\n]*:`,
        "g",
    );
    pattern.lastIndex = openIndex + 1;
    const matches = [];
    let match;
    while ((match = pattern.exec(text)) !== null && match.index < closingIndex) {
        if (isDirectObjectProperty(text, openIndex, match.index)) {
            matches.push(match);
        }
    }
    return matches;
}

function adoptEquivalentUnmanagedBlock(text, definition) {
    if (definition.adoptEquivalent !== "harmony-runtime-only") return null;
    if (countOccurrences(text, definition.anchor) !== 1) return null;

    const rootOpenIndex = findNextJson5CodeToken(text, 0, text.length);
    if (rootOpenIndex < 0 || text[rootOpenIndex] !== "{") return null;
    const rootClosingIndex = findClosingObjectBrace(text, rootOpenIndex);
    if (rootClosingIndex < 0) return null;

    const buildOptionMatches = findDirectObjectProperties(
        text,
        rootOpenIndex,
        rootClosingIndex,
        "buildOption",
    );
    if (buildOptionMatches.length !== 1) return null;

    const anchorIndex = text.indexOf(definition.anchor);
    const openIndex = anchorIndex + definition.anchor.lastIndexOf("{");
    const buildOptionOpenIndex = findNextJson5CodeToken(
        text,
        buildOptionMatches[0].index + buildOptionMatches[0][0].length,
        rootClosingIndex,
    );
    if (buildOptionOpenIndex !== openIndex) return null;

    const closingIndex = findClosingObjectBrace(text, openIndex);
    if (closingIndex < 0 || closingIndex > rootClosingIndex) return null;

    const propertyMatches = findDirectObjectProperties(
        text,
        openIndex,
        closingIndex,
        "arkOptions",
    );
    if (propertyMatches.length !== 1) return null;
    const property = propertyMatches[0];
    const equivalentMatches = [...text.matchAll(
        /^([ \t]*)(?:"arkOptions"|'arkOptions'|arkOptions)[ \t]*:\s*\{\s*(?:"runtimeOnly"|'runtimeOnly'|runtimeOnly)[ \t]*:\s*\{\s*(?:"sources"|'sources'|sources)[ \t]*:\s*\[([^\]]*)\]\s*,?\s*\}\s*,?\s*\}[ \t]*,?/gm,
    )].filter((candidate) => (
        candidate.index + candidate[1].length === property.index
    ));
    if (equivalentMatches.length !== 1) return null;

    const equivalent = equivalentMatches[0];
    const sourceArray = equivalent[2].trim().replace(/,\s*$/, "");
    const sourceTokens = sourceArray.split(",").map((token) => token.trim());
    if (!sourceTokens.every((token) => /^(['"])\.\/src\/main\/ets\/cygnat\/CygnatHarmony(?:Ads|Account)Bridge\.ets\1$/.test(token))) return null;
    const installedSources = sourceTokens.map((token) => token.slice(1, -1)).sort();
    const expectedSources = [...definition.block.matchAll(/['"](\.\/src\/main\/ets\/cygnat\/CygnatHarmony(?:Ads|Account)Bridge\.ets)['"]/g)].map((match) => match[1]).sort();
    const adsOnly = installedSources.length === 1 && installedSources[0].endsWith("CygnatHarmonyAdsBridge.ets");
    if (JSON.stringify(installedSources) !== JSON.stringify(expectedSources) && !(expectedSources.length === 2 && adsOnly)) return null;

    const equivalentEnd = equivalent.index + equivalent[0].length;
    if (equivalent.index <= openIndex || equivalentEnd > closingIndex) return null;

    return text.slice(0, equivalent.index) + definition.block + text.slice(equivalentEnd);
}

function patchManagedBlock(text, definition) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const normalized = text.replace(/\r\n/g, "\n");
    const blockLines = definition.block.split("\n");
    const startMarker = blockLines[0];
    const endMarker = blockLines[blockLines.length - 1];
    const startCount = countOccurrences(normalized, startMarker);
    const endCount = countOccurrences(normalized, endMarker);

    if (startCount !== endCount || startCount > 1) {
        return {
            conflict: definition.name + " 的托管标记缺失或重复",
        };
    }

    if (startCount === 1) {
        const start = normalized.indexOf(startMarker);
        const end = normalized.indexOf(endMarker, start) + endMarker.length;
        const installed = normalized.slice(start, end);
        if (startMarker.includes("cygnat-harmony-account:")) {
            // 账号各块共享函数名时只检查同职责块之外的内容，拒绝重复接线。
            const outside = (normalized.slice(0, start) + normalized.slice(end))
                .replace(/\/\/ <cygnat-harmony-account:[^>]+>[\s\S]*?\/\/ <\/cygnat-harmony-account:[^>]+>/g, "");
            if (definition.forbidden.some((token) => outside.includes(token))) {
                return { conflict: definition.name + " 在托管块外存在重复配置" };
            }
        }
        if (installed !== definition.block) {
            const legacyBlocks = definition.legacyBlocks || [];
            if (legacyBlocks.includes(installed)) {
                const updated = normalized.slice(0, start) + definition.block + normalized.slice(end);
                return {
                    text: eol === "\r\n" ? updated.replace(/\n/g, "\r\n") : updated,
                    changed: true,
                };
            }
            return {
                conflict: definition.name + " 的托管内容已被修改",
            };
        }
        return { text, changed: false };
    }

    const adopted = adoptEquivalentUnmanagedBlock(normalized, definition);
    if (adopted !== null) {
        return {
            text: eol === "\r\n" ? adopted.replace(/\n/g, "\r\n") : adopted,
            changed: true,
        };
    }

    if (definition.forbidden.some((token) => normalized.includes(token))) {
        return {
            conflict: definition.name + " 已存在未托管的同类配置",
        };
    }

    if (countOccurrences(normalized, definition.anchor) !== 1) {
        return {
            conflict: definition.name + " 未找到唯一的 Cocos 3.8.5 模板锚点",
        };
    }

    const replacement = definition.position === "after"
        ? definition.anchor + "\n" + definition.block
        : definition.block + "\n" + definition.anchor;
    const updated = normalized.replace(definition.anchor, replacement);
    return {
        text: eol === "\r\n" ? updated.replace(/\n/g, "\r\n") : updated,
        changed: true,
    };
}

const GENERATED_SOURCE_DIRECTORIES = new Set(["build", ".hvigor", "oh_modules"]);
const GENERATED_SOURCE_FILES = new Set(["BuildProfile.ets"]);

async function listFiles(directory, base = directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (GENERATED_SOURCE_DIRECTORIES.has(entry.name)) continue;
            files.push(...await listFiles(fullPath, base));
        } else if (entry.isFile()) {
            const relativePath = path.relative(base, fullPath).split(path.sep).join("/");
            if (GENERATED_SOURCE_FILES.has(relativePath)) continue;
            files.push(relativePath);
        }
    }
    return files;
}

async function hashDirectory(directory) {
    const hash = createHash("sha256");
    for (const relativePath of await listFiles(directory)) {
        const contents = await readFile(path.join(directory, ...relativePath.split("/")));
        hash.update(relativePath);
        hash.update("\0");
        hash.update(contents);
        hash.update("\0");
    }
    return hash.digest("hex");
}

function hashContents(contents) {
    return createHash("sha256").update(contents).digest("hex");
}

async function readJson(file) {
    try {
        return JSON.parse(await readFile(file, "utf8"));
    } catch {
        return null;
    }
}

function createResult(status, changes, messages = []) {
    return {
        status,
        changed: false,
        changes,
        messages,
    };
}

async function analyzeInstallation(project, accountOptions) {
    const extensionRoot = path.join(project, "native", "extensions");
    const destination = path.join(extensionRoot, "cygnat-harmony-ads");
    const manifestPath = path.join(extensionRoot, ".cygnat-harmony-ads-install.json");
    const entryRoot = path.join(project, "native", "engine", "harmonyos-next", "entry");
    const bridgePath = path.join(
        entryRoot,
        "src",
        "main",
        "ets",
        "cygnat",
        "CygnatHarmonyAdsBridge.ets",
    );

    const changes = [];
    const conflicts = [];
    const hostWrites = [];
    const previousManifest = await readJson(manifestPath);
    const account = accountOptions?.appId ? accountOptions : previousManifest?.account || accountOptions;
    const patches = structuredClone(PATCHES);
    const hostFiles = { ...HOST_FILES };
    let accountBridge = null;
    if (account) {
        const loginPatches = accountPatches();
        patches.page.push(...loginPatches.page);
        patches.worker.push(...loginPatches.worker);
        patches.ability = loginPatches.ability;
        const oldBlock = patches.build[0].block;
        const combined = oldBlock.replace("'./src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets'", "'./src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets',\n          './src/main/ets/cygnat/CygnatHarmonyAccountBridge.ets'");
        patches.build[0].block = combined;
        patches.build[0].legacyBlocks = [oldBlock];
        try {
            const ability = await resolveAccountAbility(project);
            hostFiles.ability = ability.relativePath;
            patches.ability[1].anchor = ability.anchor;
            patches.ability[3].anchor = ability.anchor;
            if (ability.disposeAnchor) {
                patches.ability[4].anchor = ability.disposeAnchor;
                patches.ability[4].block = '    // <cygnat-harmony-account:ability-dispose>\n    disposeHarmonyAccountFromAbility();\n    // </cygnat-harmony-account:ability-dispose>';
            }
            if (ability.relativePath.endsWith(".ts")) {
                const legacy = patches.ability[0].block;
                patches.ability[0].block = legacy.replace("import { initializeHarmonyAccount } from '@cygnat/harmony-ads';", "import { initializeHarmonyAccountFromAbility as initializeHarmonyAccount } from '@cygnat/harmony-ads/Worker';");
                patches.ability[0].legacyBlocks = [legacy];
            }
            const metadataWrite = account.appId && account.clientId ? await analyzeAccountMetadata(project, account, previousManifest?.account) : null;
            if (metadataWrite) { hostWrites.push(metadataWrite); changes.push("配置鸿蒙登录公开 ID 与网络权限"); }
            const source = await readFile(path.join(REPOSITORY_ROOT, "native", "harmonyos-next", "glue", "CygnatHarmonyAccountBridge.ets"), "utf8");
            const target = path.join(entryRoot, "src", "main", "ets", "cygnat", "CygnatHarmonyAccountBridge.ets");
            const exists = await pathExists(target);
            const installed = exists ? await readFile(target, "utf8") : null;
            if (installed !== null && installed.replace(/\r\n/g, "\n") !== source.replace(/\r\n/g, "\n") && hashContents(installed) !== previousManifest?.accountBridgeHash) {
                conflicts.push("鸿蒙账号反射端点已存在且不是受管版本");
            } else {
                accountBridge = { path: target, contents: source, hash: hashContents(source), changed: installed !== source };
                if (accountBridge.changed) changes.push("写入鸿蒙账号反射端点");
            }
        } catch (error) { conflicts.push("鸿蒙登录配置：" + error.message); }
    }
    const frameworkPackage = await readJson(path.join(REPOSITORY_ROOT, "package.json"));
    if (!frameworkPackage || typeof frameworkPackage.version !== "string") {
        conflicts.push("无法读取框架 package.json 版本");
    }

    let sourceHash = "";
    let sourceBridge = "";
    let bridgeHash = "";
    try {
        sourceHash = await hashDirectory(SOURCE_LIBRARY);
        sourceBridge = await readFile(SOURCE_BRIDGE, "utf8");
        bridgeHash = hashContents(sourceBridge);
    } catch (error) {
        conflicts.push("框架包内缺少 Harmony 广告原生源码：" + error.message);
    }

    for (const [key, relativePath] of Object.entries(hostFiles)) {
        const absolutePath = path.join(project, relativePath);
        let text;
        try {
            text = await readFile(absolutePath, "utf8");
        } catch {
            conflicts.push("缺少 Cocos 3.8.5 宿主文件：" + relativePath);
            continue;
        }

        let updated = text;
        let fileChanged = false;
        for (const definition of patches[key]) {
            const result = patchManagedBlock(updated, definition);
            if (result.conflict) {
                conflicts.push(relativePath + "：" + result.conflict);
                break;
            }
            updated = result.text;
            fileChanged = fileChanged || result.changed;
        }
        if (fileChanged) {
            changes.push("更新 " + relativePath);
            hostWrites.push({ path: absolutePath, contents: updated });
        }
    }

    const destinationExists = await pathExists(destination);
    const manifestExists = await pathExists(manifestPath);
    let manifest = null;
    let destinationNeedsCopy = false;

    if (destinationExists !== manifestExists) {
        conflicts.push("安装目录与安装清单状态不一致，拒绝覆盖");
    } else if (!destinationExists) {
        destinationNeedsCopy = true;
        changes.push("复制 Harmony 广告 HAR 源码");
        changes.push("写入安装清单");
    } else {
        manifest = await readJson(manifestPath);
        if (!manifest || typeof manifest.installedHash !== "string") {
            conflicts.push("安装清单无效，无法确认原生源码是否被修改");
        } else {
            const installedHash = await hashDirectory(destination);
            if (installedHash !== manifest.installedHash) {
                conflicts.push("已安装的 Harmony 广告源码存在用户修改，拒绝覆盖");
            } else if (installedHash !== sourceHash || manifest.sourceHash !== sourceHash) {
                destinationNeedsCopy = true;
                changes.push("更新 Harmony 广告 HAR 源码");
            }
        }
    }

    const bridgeExists = await pathExists(bridgePath);
    let bridgeNeedsWrite = false;
    if (!bridgeExists) {
        bridgeNeedsWrite = true;
        changes.push("写入 Cocos ArkTS 反射端点");
    } else {
        const installedBridge = await readFile(bridgePath, "utf8");
        const installedBridgeHash = hashContents(installedBridge);
        if (installedBridge !== sourceBridge) {
            // 只忽略桥接的 LF/CRLF 差异；应用时写回包内原始内容，让清单哈希与实际字节一致。
            const sameBridge = installedBridge.replace(/\r\n/g, "\n") === sourceBridge.replace(/\r\n/g, "\n");
            if (sameBridge || (manifest && manifest.bridgeHash === installedBridgeHash)) {
                bridgeNeedsWrite = true;
                changes.push("更新 Cocos ArkTS 反射端点");
            } else {
                conflicts.push("Cocos ArkTS 反射端点已存在且不是受管版本");
            }
        }
    }

    const expectedManifest = JSON.stringify({
        installerVersion: INSTALLER_VERSION,
        frameworkVersion: frameworkPackage?.version || "",
        protocolVersion: PROTOCOL_VERSION,
        sourceHash,
        installedHash: sourceHash,
        bridgeHash,
        ...(account ? { account, accountBridgeHash: accountBridge?.hash || "" } : {}),
    }, null, 2) + "\n";
    let manifestNeedsWrite = false;
    if (!manifestExists) {
        manifestNeedsWrite = true;
    } else {
        const currentManifest = await readFile(manifestPath, "utf8");
        if (currentManifest !== expectedManifest) {
            manifestNeedsWrite = true;
            if (!changes.includes("写入安装清单")) changes.push("更新安装清单");
        }
    }

    return {
        project,
        extensionRoot,
        destination,
        manifestPath,
        bridgePath,
        sourceBridge,
        expectedManifest,
        hostWrites,
        destinationNeedsCopy,
        bridgeNeedsWrite,
        manifestNeedsWrite,
        accountBridge,
        account,
        changes,
        conflicts,
    };
}

async function copyManagedLibrary(analysis) {
    const expectedParent = path.resolve(analysis.extensionRoot);
    if (path.dirname(path.resolve(analysis.destination)) !== expectedParent) {
        throw new Error("拒绝操作扩展目录之外的路径");
    }
    await mkdir(analysis.extensionRoot, { recursive: true });
    if (await pathExists(analysis.destination)) {
        await rm(analysis.destination, { recursive: true, force: true });
    }
    await cp(SOURCE_LIBRARY, analysis.destination, {
        recursive: true,
        filter: (sourcePath) => {
            const relativePath = path.relative(SOURCE_LIBRARY, sourcePath).split(path.sep).join("/");
            if (GENERATED_SOURCE_FILES.has(relativePath)) return false;
            return !relativePath.split("/")
                .some((part) => GENERATED_SOURCE_DIRECTORIES.has(part));
        },
    });
}

export async function runInstaller({ project, mode = "check", account }) {
    if (!project || typeof project !== "string") {
        throw new TypeError("project 必须是 Cocos 客户端根目录");
    }
    if (!["check", "dry-run", "apply"].includes(mode)) {
        throw new TypeError("mode 只能是 check、dry-run 或 apply");
    }
    if (account && (typeof account.appId !== "string" || typeof account.clientId !== "string" || Boolean(account.appId.trim()) !== Boolean(account.clientId.trim()))) {
        throw new TypeError("鸿蒙公开 appId 和 clientId 必须同时提供，或均留空仅接线；不能使用包名代替");
    }
    if (account) account = { appId: account.appId.trim(), clientId: account.clientId.trim() };

    const resolvedProject = path.resolve(project);
    const analysis = await analyzeInstallation(resolvedProject, account);
    const messages = analysis.account && !analysis.account.appId && !analysis.account.clientId ? ["登录源码接线模式：App ID、Client ID、Game Service 与 bizID 待配置；未写入任何占位 ID"] : [];
    if (analysis.conflicts.length > 0) {
        return createResult("conflict", analysis.changes, analysis.conflicts);
    }
    if (analysis.changes.length === 0) {
        return createResult("ok", [], messages);
    }
    if (mode !== "apply") {
        return createResult("changes-required", analysis.changes, messages);
    }

    if (analysis.destinationNeedsCopy) {
        await copyManagedLibrary(analysis);
    }
    for (const write of analysis.hostWrites) {
        await writeFile(write.path, write.contents, "utf8");
    }
    if (analysis.bridgeNeedsWrite) {
        await mkdir(path.dirname(analysis.bridgePath), { recursive: true });
        await writeFile(analysis.bridgePath, analysis.sourceBridge, "utf8");
    }
    if (analysis.accountBridge?.changed) {
        await mkdir(path.dirname(analysis.accountBridge.path), { recursive: true });
        await writeFile(analysis.accountBridge.path, analysis.accountBridge.contents, "utf8");
    }
    if (analysis.manifestNeedsWrite) {
        await mkdir(path.dirname(analysis.manifestPath), { recursive: true });
        await writeFile(analysis.manifestPath, analysis.expectedManifest, "utf8");
    }

    return {
        status: "ok",
        changed: true,
        changes: analysis.changes,
        messages,
    };
}

function parseArguments(argv) {
    let project = "";
    let mode = "check";
    let modeSeen = false;
    for (let index = 0; index < argv.length; index++) {
        const argument = argv[index];
        if (argument === "--project") {
            project = argv[++index] || "";
            continue;
        }
        if (["--check", "--dry-run", "--apply"].includes(argument)) {
            if (modeSeen) throw new Error("只能指定一个运行模式");
            modeSeen = true;
            mode = argument.slice(2);
            continue;
        }
        throw new Error("未知参数：" + argument);
    }
    if (!project) throw new Error("必须通过 --project 指定 Cocos 客户端根目录");
    return { project, mode };
}

async function runCli() {
    try {
        const options = parseArguments(process.argv.slice(2));
        const result = await runInstaller(options);
        for (const message of result.messages) {
            console.error("[Harmony Ads] " + message);
        }
        for (const change of result.changes) {
            console.log("[Harmony Ads] " + change);
        }
        if (result.status === "ok") {
            console.log(result.changed ? "[Harmony Ads] 安装完成" : "[Harmony Ads] 已是最新状态");
            return;
        }
        if (result.status === "changes-required") {
            console.log("[Harmony Ads] 检测到待应用改动");
            process.exitCode = options.mode === "check" ? 1 : 0;
            return;
        }
        process.exitCode = 2;
    } catch (error) {
        console.error("[Harmony Ads] " + error.message);
        process.exitCode = 2;
    }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath.toLowerCase() === path.resolve(SCRIPT_PATH).toLowerCase()) {
    await runCli();
}
