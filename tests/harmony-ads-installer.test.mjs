import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { runInstaller } = await import("../scripts/install-harmony-ads.mjs");

const roots = [];
test.after(async () => {
    await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

async function createFixture(label = "client") {
    const parent = await mkdtemp(path.join(os.tmpdir(), "cygnat harmony ads "));
    roots.push(parent);
    const project = path.join(parent, label);
    const harmonyRoot = path.join(project, "native", "engine", "harmonyos-next");
    const entry = path.join(harmonyRoot, "entry");
    await mkdir(path.join(entry, "src", "main", "ets", "pages"), { recursive: true });
    await mkdir(path.join(entry, "src", "main", "ets", "workers"), { recursive: true });
    await writeFile(path.join(harmonyRoot, "build-profile.json5"), `{
  "app": {
    "signingConfigs": [
      {
        "name": "default",
        "signConfig": {
          "keyAlias": "DO_NOT_TOUCH"
        }
      }
    ]
  },
  "modules": [
    {
      "name": "entry",
      "srcPath": "./entry",
      "targets": [{ "name": "default" }]
    }
  ]
}
`);

    await writeFile(path.join(entry, "oh-package.json5"), `{
  "name": "entry",
  "dependencies": {
    "libcocos.so": "file:./src/main/cpp/types/libcocos"
  }
}
`);
    await writeFile(path.join(entry, "build-profile.json5"), `{
  apiType: 'stageMode',
  buildOption: {
    externalNativeOptions: {
      path: '../CMakeLists.txt',
    },
  },
  targets: [{ name: 'default' }],
}
`);
    await writeFile(path.join(entry, "src", "main", "ets", "pages", "index.ets"), `import { PortProxy } from '../common/PortProxy';
import { common } from '@kit.AbilityKit';

struct Index {
  private workPort: PortProxy;

  aboutToAppear(): void {
    this.workPort._messageHandle = async (e): Promise<void> => {
      let data = e.data;
      let msg = data.data;
      switch (msg.name) {
        case "exitGame": {
          this.terminateSelf();
          break;
        }
        default: {
        }
      }
    }
  }

  aboutToDisappear(): void {
    this.workPort._messageHandle = undefined;
  }
}
`);
    await writeFile(path.join(entry, "src", "main", "ets", "workers", "cocos_worker.ts"), `import { PortProxy } from '../common/PortProxy';

let uiPort = new PortProxy(worker.workerPort);

uiPort._messageHandle = function (e) {
  var data = e.data;
  var msg = data.data;

  switch (msg.name) {
    case "onXCLoad":
      break;
    case "backPress":
      appLifecycle.onBackPress();
      break;
    default:
      console.error("cocos worker: message type unknown");
      break;
  }
}
`);
    return project;
}

async function snapshotProject(project) {
    const harmonyRoot = path.join(project, "native", "engine", "harmonyos-next");
    const entry = path.join(harmonyRoot, "entry");
    const files = [
        "oh-package.json5",
        "build-profile.json5",
        path.join("src", "main", "ets", "pages", "index.ets"),
        path.join("src", "main", "ets", "workers", "cocos_worker.ts"),
    ];
    return [
        ["root-build-profile.json5", await readFile(path.join(harmonyRoot, "build-profile.json5"), "utf8")],
        ...await Promise.all(files.map(async (file) => [file, await readFile(path.join(entry, file), "utf8")])),
    ];
}

function count(text, pattern) {
    return [...text.matchAll(pattern)].length;
}

test("installer supports check, dry-run, first apply and idempotent repeat", async () => {
    const project = await createFixture("client with spaces");
    const before = await snapshotProject(project);

    const initialCheck = await runInstaller({ project, mode: "check" });
    assert.equal(initialCheck.status, "changes-required");
    assert.ok(initialCheck.changes.length > 0);

    const dryRun = await runInstaller({ project, mode: "dry-run" });
    assert.equal(dryRun.status, "changes-required");
    assert.deepEqual(await snapshotProject(project), before);
    await assert.rejects(
        readFile(path.join(project, "native", "extensions", "cygnat-harmony-ads", "Index.ets")),
    );

    const applied = await runInstaller({ project, mode: "apply" });
    assert.equal(applied.status, "ok");
    assert.equal(applied.changed, true);

    const cleanCheck = await runInstaller({ project, mode: "check" });
    assert.equal(cleanCheck.status, "ok");
    assert.equal(cleanCheck.changed, false);
    const installedLibrary = path.join(project, "native", "extensions", "cygnat-harmony-ads");
    for (const generatedDirectory of ["build", ".hvigor", "oh_modules"]) {
        const generatedRoot = path.join(installedLibrary, generatedDirectory);
        await mkdir(generatedRoot, { recursive: true });
        await writeFile(path.join(generatedRoot, "generated.txt"), "build output");
    }
    await writeFile(path.join(installedLibrary, "BuildProfile.ets"), "generated build profile");
    const compiledCheck = await runInstaller({ project, mode: "check" });
    assert.equal(compiledCheck.status, "ok", "known Harmony build outputs do not look like source edits");


    const repeated = await runInstaller({ project, mode: "apply" });
    assert.equal(repeated.status, "ok");
    assert.equal(repeated.changed, false);

    const harmonyRoot = path.join(project, "native", "engine", "harmonyos-next");
    const entry = path.join(harmonyRoot, "entry");
    const packageText = await readFile(path.join(entry, "oh-package.json5"), "utf8");
    const buildText = await readFile(path.join(entry, "build-profile.json5"), "utf8");
    const pageText = await readFile(path.join(entry, "src", "main", "ets", "pages", "index.ets"), "utf8");
    const workerText = await readFile(path.join(entry, "src", "main", "ets", "workers", "cocos_worker.ts"), "utf8");
    const rootBuildText = await readFile(path.join(harmonyRoot, "build-profile.json5"), "utf8");

    assert.match(packageText, /"@cygnat\/harmony-ads":\s*"file:\.\.\/\.\.\/\.\.\/extensions\/cygnat-harmony-ads"/);
    assert.doesNotMatch(packageText, /[A-Z]:\\/i);
    assert.match(buildText, /runtimeOnly/);
    assert.match(buildText, /CygnatHarmonyAdsBridge\.ets/);
    assert.equal(count(rootBuildText, /<cygnat-harmony-ads:root-module>/g), 1);
    assert.match(rootBuildText, /"name":\s*"cygnat_harmony_ads"/);
    assert.match(rootBuildText, /"srcPath":\s*"\.\.\/\.\.\/extensions\/cygnat-harmony-ads"/);
    assert.match(rootBuildText, /"applyToProducts":\s*\[\s*"default"/);
    assert.match(rootBuildText, /"keyAlias":\s*"DO_NOT_TOUCH"/, "signing config remains untouched");
    assert.equal(count(pageText, /<cygnat-harmony-ads:page-import>/g), 1);
    assert.equal(count(pageText, /<cygnat-harmony-ads:page-case>/g), 1);
    assert.equal(count(pageText, /<cygnat-harmony-ads:page-dispose>/g), 1);
    assert.match(pageText, /disposeHarmonyAds\(\)/);
    assert.equal(count(workerText, /<cygnat-harmony-ads:worker-import>/g), 1);
    assert.match(workerText, /@cygnat\/harmony-ads\/Worker/);
    assert.doesNotMatch(workerText, /from\s+['"]@cygnat\/harmony-ads['"]/);
    assert.equal(count(workerText, /<cygnat-harmony-ads:worker-setup>/g), 1);
    assert.equal(count(workerText, /<cygnat-harmony-ads:worker-case>/g), 1);

    const manifest = JSON.parse(await readFile(
        path.join(project, "native", "extensions", ".cygnat-harmony-ads-install.json"),
        "utf8",
    ));
    assert.equal(manifest.protocolVersion, 1);
    assert.match(manifest.sourceHash, /^[a-f0-9]{64}$/);
    assert.equal(manifest.sourceHash, manifest.installedHash);
});

test("installer reclaims Creator-reformatted managed arkOptions and regenerated Worker", async () => {
    const project = await createFixture("creator rebuilt client");
    const entry = path.join(
        project,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
    );
    const buildPath = path.join(entry, "build-profile.json5");
    const workerPath = path.join(
        entry,
        "src",
        "main",
        "ets",
        "workers",
        "cocos_worker.ts",
    );
    const cleanWorker = await readFile(workerPath, "utf8");

    assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");

    await writeFile(buildPath, `{
  apiType: 'stageMode',
  buildOption: {
    arkOptions: {
      runtimeOnly: {
        sources: [
          './src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets',
        ],
      },
    },
    externalNativeOptions: {
      path: '../CMakeLists.txt',
    },
  },
  targets: [
    {
      name: 'default',
    },
  ],
}
`);
    await writeFile(workerPath, cleanWorker);

    const reapplied = await runInstaller({ project, mode: "apply" });
    assert.equal(reapplied.status, "ok");
    assert.equal(reapplied.changed, true);

    const buildText = await readFile(buildPath, "utf8");
    const workerText = await readFile(workerPath, "utf8");
    assert.equal(count(buildText, /<cygnat-harmony-ads:runtime-only>/g), 1);
    assert.equal(count(buildText, /arkOptions\s*:/g), 1);
    assert.match(buildText, /externalNativeOptions:\s*\{\s*path:\s*'\.\.\/CMakeLists\.txt'/);
    assert.equal(count(workerText, /<cygnat-harmony-ads:worker-import>/g), 1);
    assert.equal(count(workerText, /<cygnat-harmony-ads:worker-setup>/g), 1);
    assert.equal(count(workerText, /<cygnat-harmony-ads:worker-case>/g), 1);

    const cleanCheck = await runInstaller({ project, mode: "check" });
    assert.equal(cleanCheck.status, "ok");
    assert.equal(cleanCheck.changed, false);
    const repeated = await runInstaller({ project, mode: "apply" });
    assert.equal(repeated.status, "ok");
    assert.equal(repeated.changed, false);
});

for (const lineEnding of ["LF", "CRLF", "混合换行"]) {
    test(`安装器在清单丢失后可以重新接入只有 ${lineEnding} 差异的桥接`, async () => {
        const project = await createFixture(`恢复桥接 ${lineEnding}`);
        assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");
        const extensionRoot = path.join(project, "native", "extensions");
        const manifestPath = path.join(extensionRoot, ".cygnat-harmony-ads-install.json");
        const libraryIndex = path.join(extensionRoot, "cygnat-harmony-ads", "Index.ets");
        const bridgePath = path.join(
            project, "native", "engine", "harmonyos-next", "entry",
            "src", "main", "ets", "cygnat", "CygnatHarmonyAdsBridge.ets",
        );
        const sourceBridge = await readFile(path.join(
            process.cwd(), "native", "harmonyos-next", "glue", "CygnatHarmonyAdsBridge.ets",
        ), "utf8");
        const lfBridge = sourceBridge.replace(/\r\n/g, "\n");
        const remainingBridge = lineEnding === "LF" ? lfBridge
            : lineEnding === "CRLF" ? lfBridge.replace(/\n/g, "\r\n")
                : lfBridge.replace("\n", "\r\n");
        await rm(extensionRoot, { recursive: true, force: true });
        await writeFile(bridgePath, remainingBridge);
        const before = await snapshotProject(project);

        for (const mode of ["check", "dry-run"]) {
            const result = await runInstaller({ project, mode });
            assert.equal(result.status, "changes-required", result.messages.join("\n"));
            assert.deepEqual(await snapshotProject(project), before);
            assert.equal(await readFile(bridgePath, "utf8"), remainingBridge);
            await assert.rejects(readFile(manifestPath), { code: "ENOENT" });
            await assert.rejects(readFile(libraryIndex), { code: "ENOENT" });
        }

        const restored = await runInstaller({ project, mode: "apply" });
        assert.equal(restored.status, "ok", restored.messages.join("\n"));
        assert.equal(restored.changed, true);
        const bridgeBytes = await readFile(bridgePath);
        assert.deepEqual(bridgeBytes, Buffer.from(sourceBridge));
        const manifestBytes = await readFile(manifestPath);
        const manifest = JSON.parse(manifestBytes.toString("utf8"));
        assert.equal(manifest.bridgeHash, createHash("sha256").update(bridgeBytes).digest("hex"));

        const installed = await snapshotProject(project);
        for (const mode of ["check", "apply"]) {
            const repeated = await runInstaller({ project, mode });
            assert.equal(repeated.status, "ok");
            assert.equal(repeated.changed, false);
            assert.deepEqual(await snapshotProject(project), installed);
            assert.deepEqual(await readFile(bridgePath), bridgeBytes);
            assert.deepEqual(await readFile(manifestPath), manifestBytes);
        }
    });
}

test("安装器可以修复有清单但仅换行变化的桥接并保持字节哈希一致", async () => {
    const project = await createFixture("有清单的桥接换行变化");
    assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");
    const bridgePath = path.join(
        project, "native", "engine", "harmonyos-next", "entry",
        "src", "main", "ets", "cygnat", "CygnatHarmonyAdsBridge.ets",
    );
    const manifestPath = path.join(project, "native", "extensions", ".cygnat-harmony-ads-install.json");
    const sourceBridge = await readFile(bridgePath, "utf8");
    const lfBridge = sourceBridge.replace(/\r\n/g, "\n");
    const changedBridge = sourceBridge === lfBridge ? lfBridge.replace(/\n/g, "\r\n") : lfBridge;
    assert.notEqual(changedBridge, sourceBridge);
    await writeFile(bridgePath, changedBridge);
    const manifestBefore = await readFile(manifestPath);

    for (const mode of ["check", "dry-run"]) {
        const result = await runInstaller({ project, mode });
        assert.equal(result.status, "changes-required", result.messages.join("\n"));
        assert.equal(await readFile(bridgePath, "utf8"), changedBridge);
        assert.deepEqual(await readFile(manifestPath), manifestBefore);
    }

    assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");
    const actualBridge = await readFile(bridgePath);
    assert.deepEqual(actualBridge, Buffer.from(sourceBridge));
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.bridgeHash, createHash("sha256").update(actualBridge).digest("hex"));
    assert.equal((await runInstaller({ project, mode: "check" })).status, "ok");
    assert.equal((await runInstaller({ project, mode: "apply" })).changed, false);
});

test("安装器在清单丢失后仍拒绝桥接真实内容变化且不部分写入", async () => {
    const project = await createFixture("桥接真实内容变化");
    const workerPath = path.join(
        project, "native", "engine", "harmonyos-next", "entry",
        "src", "main", "ets", "workers", "cocos_worker.ts",
    );
    const cleanWorker = await readFile(workerPath);
    assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");
    const extensionRoot = path.join(project, "native", "extensions");
    const bridgePath = path.join(
        project, "native", "engine", "harmonyos-next", "entry",
        "src", "main", "ets", "cygnat", "CygnatHarmonyAdsBridge.ets",
    );
    const sourceBridge = (await readFile(bridgePath, "utf8")).replace(/\r\n/g, "\n");
    await rm(extensionRoot, { recursive: true, force: true });
    await writeFile(workerPath, cleanWorker);

    for (const customizedBridge of [
        sourceBridge.replace("return submitHarmonyAdRequest(requestJson);", "return false;"),
        sourceBridge.replace("\n", " \n"),
        sourceBridge.replace("\n", "\r"),
    ]) {
        assert.notEqual(customizedBridge.replace(/\r\n/g, "\n"), sourceBridge);
        await writeFile(bridgePath, customizedBridge);
        const before = await snapshotProject(project);

        for (const mode of ["check", "dry-run", "apply"]) {
            const result = await runInstaller({ project, mode });
            assert.equal(result.status, "conflict");
            assert.ok(result.messages.some((message) => message.includes("反射端点已存在且不是受管版本")));
            assert.deepEqual(await snapshotProject(project), before);
            assert.equal(await readFile(bridgePath, "utf8"), customizedBridge);
            await assert.rejects(readFile(path.join(extensionRoot, "cygnat-harmony-ads", "Index.ets")), {
                code: "ENOENT",
            });
            await assert.rejects(readFile(path.join(extensionRoot, ".cygnat-harmony-ads-install.json")), {
                code: "ENOENT",
            });
        }
    }
});

test("桥接换行容错不放宽已安装 HAR 源码的字节保护", async () => {
    const project = await createFixture("HAR 换行仍受保护");
    assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");
    const installedIndex = path.join(project, "native", "extensions", "cygnat-harmony-ads", "Index.ets");
    const sourceIndex = await readFile(installedIndex, "utf8");
    const lfIndex = sourceIndex.replace(/\r\n/g, "\n");
    const customizedIndex = sourceIndex === lfIndex ? lfIndex.replace(/\n/g, "\r\n") : lfIndex;
    assert.notEqual(customizedIndex, sourceIndex);
    await writeFile(installedIndex, customizedIndex);
    const before = await snapshotProject(project);

    const result = await runInstaller({ project, mode: "apply" });
    assert.equal(result.status, "conflict");
    assert.ok(result.messages.some((message) => message.includes("源码存在用户修改")));
    assert.deepEqual(await snapshotProject(project), before);
    assert.equal(await readFile(installedIndex, "utf8"), customizedIndex);
});

test("installer rejects unknown templates and broken managed markers without partial writes", async () => {
    const unknown = await createFixture("unknown");
    const workerPath = path.join(
        unknown,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "src",
        "main",
        "ets",
        "workers",
        "cocos_worker.ts",
    );
    await writeFile(workerPath, "export const customWorker = true;\n");

    const unknownResult = await runInstaller({ project: unknown, mode: "apply" });
    assert.equal(unknownResult.status, "conflict");
    await assert.rejects(
        readFile(path.join(unknown, "native", "extensions", "cygnat-harmony-ads", "Index.ets")),
    );

    const broken = await createFixture("broken marker");
    assert.equal((await runInstaller({ project: broken, mode: "apply" })).status, "ok");
    const pagePath = path.join(
        broken,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "src",
        "main",
        "ets",
        "pages",
        "index.ets",
    );
    const page = await readFile(pagePath, "utf8");
    await writeFile(pagePath, page.replace("// </cygnat-harmony-ads:page-case>", ""));

    const brokenCheck = await runInstaller({ project: broken, mode: "check" });
    assert.equal(brokenCheck.status, "conflict");
    const brokenApply = await runInstaller({ project: broken, mode: "apply" });
    assert.equal(brokenApply.status, "conflict");
});

test("installer protects modified installed source", async () => {
    const project = await createFixture("modified library");
    assert.equal((await runInstaller({ project, mode: "apply" })).status, "ok");

    const installedIndex = path.join(
        project,
        "native",
        "extensions",
        "cygnat-harmony-ads",
        "Index.ets",
    );
    await writeFile(installedIndex, (await readFile(installedIndex, "utf8")) + "\n// user change\n");

    const result = await runInstaller({ project, mode: "apply" });
    assert.equal(result.status, "conflict");
    assert.match(await readFile(installedIndex, "utf8"), /user change/);
});

test("installer works independently for a second clean Cocos template", async () => {
    const first = await createFixture("first game");
    const second = await createFixture("second clean game");

    assert.equal((await runInstaller({ project: first, mode: "apply" })).status, "ok");
    assert.equal((await runInstaller({ project: second, mode: "apply" })).status, "ok");
    assert.equal((await runInstaller({ project: first, mode: "check" })).status, "ok");
    assert.equal((await runInstaller({ project: second, mode: "check" })).status, "ok");

    const firstManifest = await readFile(
        path.join(first, "native", "extensions", ".cygnat-harmony-ads-install.json"),
        "utf8",
    );
    const secondManifest = await readFile(
        path.join(second, "native", "extensions", ".cygnat-harmony-ads-install.json"),
        "utf8",
    );
    assert.equal(firstManifest, secondManifest);
});
test("installer rejects an unmanaged existing arkOptions block", async () => {
    const project = await createFixture("existing ark options");
    const buildPath = path.join(
        project,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "build-profile.json5",
    );
    const original = await readFile(buildPath, "utf8");
    const customized = original.replace(
        "  buildOption: {",
        "  buildOption: {\n    arkOptions: {\n      byteCodeHar: true,\n    },",
    );
    await writeFile(buildPath, customized);

    const result = await runInstaller({ project, mode: "apply" });
    assert.equal(result.status, "conflict");
    assert.equal(await readFile(buildPath, "utf8"), customized);
    await assert.rejects(
        readFile(path.join(project, "native", "extensions", "cygnat-harmony-ads", "Index.ets")),
    );
});

test("installer rejects a managed-looking arkOptions block with a modified bridge path", async () => {
    const project = await createFixture("modified bridge path");
    const buildPath = path.join(
        project,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "build-profile.json5",
    );
    const original = await readFile(buildPath, "utf8");
    const customized = original.replace(
        "  buildOption: {",
        `  buildOption: {
    arkOptions: {
      runtimeOnly: {
        sources: [
          './src/main/ets/cygnat/ModifiedHarmonyAdsBridge.ets',
        ],
      },
    },`,
    );
    await writeFile(buildPath, customized);

    const result = await runInstaller({ project, mode: "apply" });
    assert.equal(result.status, "conflict");
    assert.equal(await readFile(buildPath, "utf8"), customized);
    await assert.rejects(
        readFile(path.join(project, "native", "extensions", "cygnat-harmony-ads", "Index.ets")),
    );
});

test("installer rejects a second inline arkOptions beside an equivalent managed block", async () => {
    const project = await createFixture("duplicate inline ark options");
    const buildPath = path.join(
        project,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "build-profile.json5",
    );
    const customized = `{
  apiType: 'stageMode',
  buildOption: {
    arkOptions: {
      runtimeOnly: {
        sources: [
          './src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets',
        ],
      },
    },
    externalNativeOptions: {}, arkOptions: { byteCodeHar: true },
  },
  targets: [{ name: 'default' }],
}
`;
    await writeFile(buildPath, customized);

    const result = await runInstaller({ project, mode: "apply" });
    assert.equal(result.status, "conflict");
    assert.equal(await readFile(buildPath, "utf8"), customized);
    await assert.rejects(
        readFile(path.join(project, "native", "extensions", "cygnat-harmony-ads", "Index.ets")),
    );
});

test("installer only reclaims a root-level buildOption property", async () => {
    const project = await createFixture("nested build option");
    const buildPath = path.join(
        project,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "build-profile.json5",
    );
    const customized = `{
  custom: {
  buildOption: {
    arkOptions: {
      runtimeOnly: {
        sources: [
          './src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets',
        ],
      },
    },
  },
  },
  targets: [{ name: 'default' }],
}
`;
    await writeFile(buildPath, customized);

    const result = await runInstaller({ project, mode: "apply" });
    assert.equal(result.status, "conflict");
    assert.equal(await readFile(buildPath, "utf8"), customized);
    await assert.rejects(
        readFile(path.join(project, "native", "extensions", "cygnat-harmony-ads", "Index.ets")),
    );
});

test("installer ignores property-shaped arkOptions text in comments and strings", async () => {
    const project = await createFixture("commented ark options");
    const buildPath = path.join(
        project,
        "native",
        "engine",
        "harmonyos-next",
        "entry",
        "build-profile.json5",
    );
    await writeFile(buildPath, `{
  apiType: 'stageMode',
  buildOption: {
    /*
    arkOptions: {
      runtimeOnly: {
        sources: [
          './src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets',
        ],
      },
    },
    */
    note: 'arkOptions: { byteCodeHar: true }',
    arkOptions: {
      runtimeOnly: {
        sources: [
          './src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets',
        ],
      },
    },
    externalNativeOptions: {
      path: '../CMakeLists.txt',
    },
  },
  targets: [{ name: 'default' }],
}
`);

    const applied = await runInstaller({ project, mode: "apply" });
    assert.equal(applied.status, "ok");
    assert.equal(applied.changed, true);

    const buildText = await readFile(buildPath, "utf8");
    assert.match(buildText, /note:\s*'arkOptions: \{ byteCodeHar: true \}'/);
    assert.equal(count(buildText, /<cygnat-harmony-ads:runtime-only>/g), 1);
    const cleanCheck = await runInstaller({ project, mode: "check" });
    assert.equal(cleanCheck.status, "ok");
    assert.equal(cleanCheck.changed, false);
});
