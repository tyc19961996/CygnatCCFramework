import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/install-apk233-ads.mjs", import.meta.url));
const bundledBridge = fileURLToPath(new URL("../native/android-233/src/com/cygnat/apk233/Cygnat233AdsBridge.java", import.meta.url));
const bridgePath = "src/com/cygnat/apk233/Cygnat233AdsBridge.java";
const activityPath = "src/com/cocos/game/AppActivity.java";
const aarName = "mpg-cm-v1.1.1.aar";
const temporaryRoot = path.resolve(tmpdir());
const fixtures = [];

async function tempFolder(prefix) {
    const directory = await mkdtemp(path.join(temporaryRoot, prefix));
    fixtures.push(directory);
    return directory;
}

test.after(async () => {
    for (const directory of fixtures) {
        assert.equal(path.dirname(directory), temporaryRoot);
        await rm(directory, { recursive: true, force: true });
    }
});

const activity = [
    "package com.cocos.game;",
    "",
    "import android.os.Bundle;",
    "import com.cocos.lib.CocosActivity;",
    "",
    "public class AppActivity extends CocosActivity {",
    "    @Override",
    "    protected void onCreate(Bundle savedInstanceState) {",
    "        super.onCreate(savedInstanceState);",
    "        SDKWrapper.shared().init(this);",
    "    }",
    "    @Override",
    "    protected void onDestroy() {",
    "        super.onDestroy();",
    "        SDKWrapper.shared().onDestroy();",
    "    }",
    "}",
    "",
].join("\r\n");

const gradle = [
    "android {",
    "    sourceSets.main {",
    '        java.srcDirs "../src", "src"',
    '        manifest.srcFile "AndroidManifest.xml"',
    "    }",
    "    buildTypes {",
    "        release {",
    "            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'",
    "        }",
    "    }",
    "}",
    "dependencies {",
    "    implementation fileTree(dir: 'libs', include: ['*.jar','*.aar'])",
    "}",
    "",
].join("\n");

function manifest(queries = "") {
    return [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
        queries,
        "    <application>",
        '        <activity android:name="com.cocos.game.AppActivity" />',
        "    </application>",
        "</manifest>",
        "",
    ].join("\n");
}

async function fixture({ androidManifest = manifest(), buildGradle = gradle, java = activity } = {}) {
    const project = await tempFolder("cygnat-apk233-installer-");
    const app = path.join(project, "native", "engine", "android", "app");
    const aar = path.join(project, aarName);
    await mkdir(path.join(app, "src", "com", "cocos", "game"), { recursive: true });
    await writeFile(path.join(project, "package.json"), "{}");
    await writeFile(path.join(app, activityPath), java);
    await writeFile(path.join(app, "build.gradle"), buildGradle);
    await writeFile(path.join(app, "AndroidManifest.xml"), androidManifest);
    await writeFile(path.join(app, "proguard-rules.pro"), "-dontwarn com.example.**\n");
    // 测试归档仅含最小 Manifest 与占位 JAR，由测试使用，非 233 SDK。
    const aarBytes = Buffer.from([
        "UEsDBBQAAAAAAAAAIVwgyb8InwAAAJ8AAAALAAAAY2xhc3Nlcy5qYXJQSwMEFAAAAAAAAAAhXFm5MDoVAAAAFQAAABQAAAB",
        "NRVRBLUlORi9NQU5JRkVTVC5NRk1hbmlmZXN0LVZlcnNpb246IDEuMFBLAQIUABQAAAAAAAAAIVxZuTA6FQAAABUAAAAUAA",
        "AAAAAAAAAAAAAAAAAAAABNRVRBLUlORi9NQU5JRkVTVC5NRlBLBQYAAAAAAQABAEIAAABHAAAAAABQSwMEFAAAAAAAAAAhX",
        "O03yYsLAAAACwAAABMAAABBbmRyb2lkTWFuaWZlc3QueG1sPG1hbmlmZXN0Lz5QSwECFAAUAAAAAAAAACFcIMm/CJ8AAACf",
        "AAAACwAAAAAAAAAAAAAAAAAAAAAAY2xhc3Nlcy5qYXJQSwECFAAUAAAAAAAAACFc7TfJiwsAAAALAAAAEwAAAAAAAAAAAAA",
        "AAADIAAAAQW5kcm9pZE1hbmlmZXN0LnhtbFBLBQYAAAAAAgACAHoAAAAEAQAAAAA=",
    ].join(""), "base64");
    await writeFile(aar, aarBytes);
    return { project, app, aar, aarBytes };
}

function run(project, ...args) {
    return spawnSync(process.execPath, [script, "--project", project, ...args], { encoding: "utf8" });
}

async function snapshot(root) {
    const files = await readdir(root, { recursive: true, withFileTypes: true });
    return Object.fromEntries(await Promise.all(files.filter((file) => file.isFile()).map(async (file) => {
        const full = path.join(file.parentPath, file.name);
        return [path.relative(root, full), (await readFile(full)).toString("base64")];
    })));
}

test("预演和检查不写入，首次接线后可以重复执行且保留原有配置", async () => {
    const { project, app, aar, aarBytes } = await fixture({
        androidManifest: manifest([
            "    <queries>",
            '        <package android:name="com.example.partner" />',
            "    </queries>",
        ].join("\n")),
    });
    const original = await snapshot(app);
    const preview = run(project, "--aar", aar, "--dry-run");
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /AppActivity\.java/);
    assert.equal(run(project, "--aar", aar, "--check").status, 1);
    assert.deepEqual(await snapshot(app), original);

    const installed = run(project, "--aar", aar, "--apply");
    assert.equal(installed.status, 0, installed.stderr);
    assert.deepEqual(await readFile(path.join(app, "libs", aarName)), aarBytes);
    assert.deepEqual(await readFile(path.join(app, bridgePath)), await readFile(bundledBridge));

    const java = await readFile(path.join(app, activityPath), "utf8");
    assert.match(java, /Cygnat233AdsBridge\.attach\(this\);\r\n {8}super\.onCreate/);
    assert.match(java, /Cygnat233AdsBridge\.detach\(this\);\r\n {8}super\.onDestroy/);
    assert.match(java, /SDKWrapper\.shared\(\)\.init\(this\);/);

    const xml = await readFile(path.join(app, "AndroidManifest.xml"), "utf8");
    assert.equal((xml.match(/<queries>/g) || []).length, 1);
    assert.match(xml, /com\.example\.partner/);
    assert.match(xml, /com\.meta\.box/);
    assert.match(xml, /android\.permission\.INTERNET/);
    const proguard = await readFile(path.join(app, "proguard-rules.pro"), "utf8");
    assert.match(proguard, /-dontwarn com\.example/);
    assert.match(proguard, /-keep class com\.cygnat\.apk233\.Cygnat233AdsBridge/);
    assert.equal(await readFile(path.join(app, "build.gradle"), "utf8"), gradle);

    const connected = await snapshot(app);
    const checked = run(project, "--check");
    assert.equal(checked.status, 0, checked.stderr);
    const repeated = run(project, "--apply");
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.deepEqual(await snapshot(app), connected);
});

test("无默认 AAR 规则时补入 Gradle 依赖，并支持重新生成宿主文件后补接线", async () => {
    const { project, app, aar } = await fixture({
        buildGradle: gradle.replace("    implementation fileTree(dir: 'libs', include: ['*.jar','*.aar'])\n", ""),
    });
    assert.equal(run(project, "--aar", aar, "--apply").status, 0);
    assert.match(await readFile(path.join(app, "build.gradle"), "utf8"), /implementation files\('libs\/mpg-cm-v1\.1\.1\.aar'\)/);
    const xml = await readFile(path.join(app, "AndroidManifest.xml"), "utf8");
    assert.match(xml, /<queries>\s*<package android:name="com\.meta\.box" \/>/);
    await writeFile(path.join(app, activityPath), activity);
    assert.equal(run(project, "--check").status, 1);
    assert.equal(run(project, "--apply").status, 0);
    assert.equal(run(project, "--check").status, 0);
});

test("模板冲突及手工桥接冲突在写入前报告", async () => {
    const invalid = await fixture({ java: activity.replace("super.onDestroy();", "super.onStop();") });
    const before = await snapshot(invalid.app);
    const result = run(invalid.project, "--aar", invalid.aar, "--apply");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /onDestroy/);
    assert.deepEqual(await snapshot(invalid.app), before);

    const manual = await fixture();
    await mkdir(path.dirname(path.join(manual.app, bridgePath)), { recursive: true });
    await writeFile(path.join(manual.app, bridgePath), "package com.cygnat.apk233; // 手工实现");
    const manualBefore = await snapshot(manual.app);
    assert.equal(run(manual.project, "--aar", manual.aar, "--apply").status, 2);
    assert.deepEqual(await snapshot(manual.app), manualBefore);
});

test("缺少或传错 AAR 时保留宿主文件", async () => {
    const { project, app, aar } = await fixture();
    const before = await snapshot(app);
    assert.equal(run(project, "--apply").status, 2);
    await writeFile(aar, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const bad = run(project, "--aar", aar, "--apply");
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /AAR/);
    assert.deepEqual(await snapshot(app), before);
});

test("安装器会随框架一起打包", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    assert.ok(packageJson.files.includes("scripts/install-apk233-ads.mjs"));
});


test("标准 fileTree 与其他路径的 233 AAR 并存时拒绝写入", async () => {
    const { project, app, aar } = await fixture({
        buildGradle: gradle.replace("dependencies {\n", "dependencies {\n    implementation files('third-party/mpg-cm-v1.1.1.aar')\n"),
    });
    const before = await snapshot(app);
    const result = run(project, "--aar", aar, "--apply");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /third-party/);
    assert.deepEqual(await snapshot(app), before);
});

test("宿主目录是链接时不向其他目录写入 AAR", async () => {
    const { project, app, aar } = await fixture();
    const outside = await tempFolder("cygnat-apk233-external-");
    await symlink(outside, path.join(app, "libs"), "junction");
    const before = await snapshot(app);
    const result = run(project, "--aar", aar, "--apply");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /链接/);
    assert.deepEqual(await snapshot(app), before);
    assert.deepEqual(await readdir(outside), []);
});


test("可向已接线的广告 APK 追加登录 SDK 并重复检查", async () => {
    const { project, app, aar, aarBytes } = await fixture();
    const gradleRoot = path.join(project, "build", "android", "proj");
    const properties = path.join(gradleRoot, "gradle.properties");
    await mkdir(gradleRoot, { recursive: true });
    await writeFile(properties, "android.useAndroidX=true\r\nandroid.enableJetifier=false\r\n");
    assert.equal(run(project, "--aar", aar, "--apply").status, 0);
    assert.match(await readFile(properties, "utf8"), /enableJetifier=false/);
    const loginAar = path.join(project, "mpg-pay-v3.2.24.aar");
    await writeFile(loginAar, aarBytes);
    const preview = run(project, "--login-aar", loginAar, "--dry-run");
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Cygnat233AccountBridge/);
    assert.match(await readFile(properties, "utf8"), /enableJetifier=false/);
    const install = run(project, "--login-aar", loginAar, "--apply");
    assert.equal(install.status, 0, install.stderr);
    const java = await readFile(path.join(app, activityPath), "utf8");
    assert.equal((java.match(/Cygnat233AccountBridge\.(attach|detach)\(this\)/g) || []).length, 2);
    assert.equal((java.match(/Cygnat233AdsBridge\.(attach|detach)\(this\)/g) || []).length, 2);
    assert.deepEqual(await readFile(path.join(app, "libs", "mpg-pay-v3.2.24.aar")), aarBytes);
    const proguard = await readFile(path.join(app, "proguard-rules.pro"), "utf8");
    assert.match(proguard, /Cygnat233AccountBridge/);
    const buildGradle = await readFile(path.join(app, "build.gradle"), "utf8");
    assert.match(buildGradle, /androidx\.appcompat:appcompat:/);
    assert.match(buildGradle, /com\.github\.bumptech\.glide:glide:/);
    assert.match(buildGradle, /com\.alipay\.sdk:alipaysdk-android:15\.8\.42/);
    assert.equal(await readFile(properties, "utf8"), "android.useAndroidX=true\r\nandroid.enableJetifier=true\r\n");
    assert.equal(run(project, "--check").status, 0);
    const snapshotBefore = await snapshot(app);
    assert.equal(run(project, "--apply").status, 0);
    assert.deepEqual(await snapshot(app), snapshotBefore);
});

test("登录 AAR 与已有 Gradle 依赖冲突时不会部分安装", async () => {
    const { project, app, aar, aarBytes } = await fixture({
        buildGradle: gradle.replace("dependencies {", "dependencies {\n    implementation files('libs/mpg-pay-v3.2.19.aar')"),
    });
    const loginAar = path.join(project, "mpg-pay-v3.2.24.aar");
    await writeFile(loginAar, aarBytes);
    const original = await snapshot(app);
    const result = run(project, "--aar", aar, "--login-aar", loginAar, "--apply");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /mpg-pay-v3\.2\.19\.aar/);
    assert.deepEqual(await snapshot(app), original);
});
