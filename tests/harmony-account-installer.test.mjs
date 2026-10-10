import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runInstaller } from '../scripts/install-harmony-ads.mjs';

async function fixture(t, metadata = '') {
    const project = await mkdtemp(path.join(os.tmpdir(), 'cygnat-account-'));
    t.after(() => rm(project, { recursive: true, force: true }));
    const root = path.join(project, 'native/engine/harmonyos-next');
    const entry = path.join(root, 'entry');
    const files = {
        'build-profile.json5': '{\n  "app": {"signingConfigs": [{"name":"保持签名"}]},\n  "modules": [\n    {"name":"entry"}\n  ]\n}',
        'entry/oh-package.json5': '{\n  "dependencies": {\n    "libcocos.so": "file:./cpp"\n  }\n}',
        'entry/build-profile.json5': '{\n  buildOption: {\n    externalNativeOptions: {path: "keep"},\n  },\n}',
        'entry/src/main/module.json5': `{module:{name:'entry', ${metadata} abilities:[{name:'EntryAbility',srcEntry:'./ets/entryability/EntryAbility.ets'}]}}`,
        'entry/src/main/ets/pages/index.ets': `import { PortProxy } from '../common/PortProxy';\nstruct Index {\n  aboutToDisappear(): void {\n  }\n  f() {switch(msg.name){\n        case "exitGame": {\n        }\n  }}\n}`,
        'entry/src/main/ets/workers/cocos_worker.ts': `import { PortProxy } from '../common/PortProxy';\nlet uiPort = new PortProxy(worker.workerPort);\nswitch(msg.name){\n    case "backPress":\n      break;\n}`,
        'entry/src/main/ets/entryability/EntryAbility.ets': `import UIAbility from '@ohos.app.ability.UIAbility';\nexport default class EntryAbility extends UIAbility {\n onWindowStageCreate(windowStage) {\n    windowStage.loadContent('pages/index', (err, data) => {\n      if (err.code) { return; }\n    });\n }\n}`,
    };
    for (const [name, contents] of Object.entries(files)) {
        const file = path.join(root, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, contents);
    }
    return { project, root, entry };
}
const account = { appId: 'public-app', clientId: 'public-client' };

test('r2 与诊断版托管块可升级生命周期保护，保留宿主已有销毁方法且幂等', async (t) => {
    for (const diagnostic of [false, true]) {
        const { project, entry } = await fixture(t);
        const file = path.join(entry, 'src/main/ets/entryability/EntryAbility.ets');
        const original = (await readFile(file, 'utf8')).replace('export default class EntryAbility extends UIAbility {', 'export default class EntryAbility extends UIAbility {\n onWindowStageDestroy() {\n   keepOriginal();\n }');
        await writeFile(file, original);
        assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
        let legacy = (await readFile(file, 'utf8')).replace(/^[ \t]*\/\/ <cygnat-harmony-account:ability-(?:lifecycle-import|generation|dispose)>[\s\S]*?\/\/ <\/cygnat-harmony-account:ability-(?:lifecycle-import|generation|dispose)>\n?/gm, '');
        legacy = legacy.replace('this.context, cygnatAccountLifecycle', 'this.context');
        if (!diagnostic) legacy = legacy.split('\n').filter((line) => !line.includes('stage=ability-callback')).join('\n');
        await writeFile(file, legacy);
        assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
        assert.equal((await runInstaller({ project, mode: 'check', account })).status, 'ok');
        const upgraded = await readFile(file, 'utf8');
        assert.equal((upgraded.match(/onWindowStageDestroy\(/g) || []).length, 1);
        assert.equal((upgraded.match(/disposeHarmonyAccountFromAbility\(\)/g) || []).length, 1);
        assert.match(upgraded, /keepOriginal\(\)/);
        assert.match(upgraded, /this.context, cygnatAccountLifecycle/);
    }
});

test('销毁回调兼容通常空白，未知同名签名拒绝而不新增重复方法', async (t) => {
    for (const signature of ['onWindowStageDestroy():void {', 'onWindowStageDestroy ( ) : void {', 'onWindowStageDestroy(arg: number) {']) {
        const { project, entry } = await fixture(t);
        const file = path.join(entry, 'src/main/ets/entryability/EntryAbility.ets');
        const original = (await readFile(file, 'utf8')).replace('export default class EntryAbility extends UIAbility {', 'export default class EntryAbility extends UIAbility {\n ' + signature + '\n keepOriginal();\n }');
        await writeFile(file, original);
        const result = await runInstaller({ project, mode: 'apply', account });
        if (signature.includes('arg')) {
            assert.equal(result.status, 'conflict');
            assert.equal(await readFile(file, 'utf8'), original);
        } else {
            assert.equal(result.status, 'ok');
            assert.equal((await readFile(file, 'utf8')).match(/onWindowStageDestroy/g).length, 1);
        }
    }
});
test('登录安装器 dry-run 不写入，apply 增加公开 metadata、网络权限和独立消息且幂等', async (t) => {
    const { project, root, entry } = await fixture(t, "metadata:[{name:'keep',value:'广告配置'}],");
    const moduleFile = path.join(entry, 'src/main/module.json5');
    const before = await readFile(moduleFile, 'utf8');
    assert.equal((await runInstaller({ project, mode: 'dry-run', account })).status, 'changes-required');
    assert.equal(await readFile(moduleFile, 'utf8'), before);
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
    const installed = await readFile(moduleFile, 'utf8');
    assert.match(installed, /public-app/); assert.match(installed, /public-client/); assert.match(installed, /ohos.permission.INTERNET/);
    assert.match(installed, /广告配置/);
    assert.match(await readFile(path.join(root, 'build-profile.json5'), 'utf8'), /保持签名/);
    assert.match(await readFile(path.join(entry, 'build-profile.json5'), 'utf8'), /CygnatHarmonyAccountBridge/);
    assert.match(await readFile(path.join(entry, 'src/main/ets/entryability/EntryAbility.ets'), 'utf8'), /initializeHarmonyAccount/);
    assert.equal((await runInstaller({ project, mode: 'check', account })).status, 'ok');
    assert.equal((await runInstaller({ project, mode: 'apply', account })).changed, false);
    assert.equal((await runInstaller({ project, mode: 'check' })).status, 'ok', '广告安装器不会删除已安装登录配置');
});
test('公开ID缺失、冲突或重复 metadata 均拒绝，且不会部分写入广告配置', async (t) => {
    const { project, root } = await fixture(t, "metadata:[{name:'app_id',value:'other'}],");
    const before = await readFile(path.join(root, 'build-profile.json5'), 'utf8');
    const result = await runInstaller({ project, mode: 'apply', account });
    assert.equal(result.status, 'conflict');
    assert.equal(await readFile(path.join(root, 'build-profile.json5'), 'utf8'), before);
    await assert.rejects(runInstaller({ project, mode: 'apply', account: { appId: '', clientId: 'id' } }));
    const second = await fixture(t, "metadata:[{name:'app_id',value:'public-app'},{name:'app_id',value:'public-app'}],");
    assert.equal((await runInstaller({ project: second.project, mode: 'apply', account })).status, 'conflict');
});
test('广告已安装后增量登录，Creator 重构建后重新安装保留权限与广告', async (t) => {
    const { project, entry } = await fixture(t);
    assert.equal((await runInstaller({ project, mode: 'apply' })).status, 'ok');
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
    await writeFile(path.join(entry, 'src/main/module.json5'), "{module:{name:'entry',requestPermissions:[{name:'ohos.permission.INTERNET'}],abilities:[{name:'EntryAbility',srcEntry:'./ets/entryability/EntryAbility.ets'}]}}");
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
    const worker = await readFile(path.join(entry, 'src/main/ets/workers/cocos_worker.ts'), 'utf8');
    assert.match(worker, /cygnatAdsRequest/); assert.match(worker, /cygnatAccountRequest/);
});

test('Creator 重排联合 runtimeOnly 后可以重新收编，额外源码配置仍拒绝', async (t) => {
    const { project, entry } = await fixture(t);
    await runInstaller({ project, mode: 'apply', account });
    const file = path.join(entry, 'build-profile.json5');
    await writeFile(file, `{\n  buildOption: {\n    arkOptions: {runtimeOnly:{sources:["./src/main/ets/cygnat/CygnatHarmonyAccountBridge.ets", "./src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets",]}},\n  },\n}`);
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
    await writeFile(file, `{\n  buildOption: {\n    arkOptions: {runtimeOnly:{sources:["./src/main/ets/cygnat/CygnatHarmonyAccountBridge.ets", "./src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets", "./unknown.ets"]}},\n  },\n}`);
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'conflict');
});

test('受管公开 ID 可以更新，用户修改值与账号桥接内容都受保护', async (t) => {
    const { project, entry } = await fixture(t);
    await runInstaller({ project, mode: 'apply', account });
    const next = { appId: 'next-app', clientId: 'next-client' };
    assert.equal((await runInstaller({ project, mode: 'apply', account: next })).status, 'ok');
    const file = path.join(entry, 'src/main/module.json5');
    const text = await readFile(file, 'utf8');
    await writeFile(file, text.replace('next-app', 'user-app'));
    assert.equal((await runInstaller({ project, mode: 'apply', account: next })).status, 'conflict');
    await writeFile(file, text);
    const bridge = path.join(entry, 'src/main/ets/cygnat/CygnatHarmonyAccountBridge.ets');
    await writeFile(bridge, (await readFile(bridge, 'utf8')) + '\n// 用户修改\n');
    assert.equal((await runInstaller({ project, mode: 'apply', account: next })).status, 'conflict');
});

test('未提供公开 ID 时仅接线并明确待配置，随后可补 ID，不能写入占位值', async (t) => {
    const { project, entry } = await fixture(t);
    const file = path.join(entry, 'src/main/module.json5');
    const before = await readFile(file, 'utf8');
    const result = await runInstaller({ project, mode: 'apply', account: { appId: '', clientId: '' } });
    assert.equal(result.status, 'ok');
    assert.ok(result.messages.some((s) => s.includes('待配置')));
    assert.equal(await readFile(file, 'utf8'), before);
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
    assert.match(await readFile(file, 'utf8'), /public-app/);
});

test('托管块以外新增重复账号初始化时拒绝并保持原文件', async (t) => {
    const { project, entry } = await fixture(t);
    await runInstaller({ project, mode: 'apply', account });
    const file = path.join(entry, 'src/main/ets/entryability/EntryAbility.ets');
    const text = await readFile(file, 'utf8');
    await writeFile(file, text + '\ninitializeHarmonyAccount(this.context);\n');
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'conflict');
    assert.equal(await readFile(file, 'utf8'), text + '\ninitializeHarmonyAccount(this.context);\n');
});

test('已有公开 ID 时只接线不会遗失受管 ID 历史', async (t) => {
    const { project, entry } = await fixture(t);
    await runInstaller({ project, mode: 'apply', account });
    assert.equal((await runInstaller({ project, mode: 'apply', account: { appId: '', clientId: '' } })).changed, false);
    assert.equal((await runInstaller({ project, mode: 'apply', account: { appId: 'next', clientId: 'next' } })).status, 'ok');
    assert.match(await readFile(path.join(entry, 'src/main/module.json5'), 'utf8'), /next/);
});

test('真实 Creator ts 入口与双引号按 srcEntry 定位，旁边 ets 不被修改', async (t) => {
    const { project, entry } = await fixture(t);
    const moduleFile = path.join(entry, 'src/main/module.json5');
    await writeFile(moduleFile, (await readFile(moduleFile, 'utf8')).replace('EntryAbility.ets', 'EntryAbility.ts'));
    const ets = path.join(entry, 'src/main/ets/entryability/EntryAbility.ets');
    const before = await readFile(ets, 'utf8');
    const file = path.join(entry, 'src/main/ets/entryability/EntryAbility.ts');
    await writeFile(file, before.replace("loadContent('pages/index'", 'loadContent("pages/index"'));
    assert.equal((await runInstaller({ project, mode: 'apply', account })).status, 'ok');
    assert.match(await readFile(file, 'utf8'), /initializeHarmonyAccount/);
    assert.match(await readFile(file, 'utf8'), /initializeHarmonyAccountFromAbility as initializeHarmonyAccount.*@cygnat\/harmony-ads\/Worker/);
    assert.equal(await readFile(ets, 'utf8'), before);
    assert.equal((await runInstaller({ project, mode: 'check', account })).status, 'ok');
});

test('入口声明缺失、重复、越界和重复加载锚点均拒绝且不部分写入', async (t) => {
    for (const abilities of [[], [{name:'EntryAbility'}], [{name:'EntryAbility',srcEntry:'../../../outside.ts'}], [{name:'EntryAbility',srcEntry:'./ets/entryability/EntryAbility.ts'},{name:'EntryAbility',srcEntry:'./ets/entryability/EntryAbility.ets'}]]) {
        const { project, root, entry } = await fixture(t);
        await writeFile(path.join(entry, 'src/main/module.json5'), JSON.stringify({module:{name:'entry',mainElement:'EntryAbility',abilities}}));
        const before = await readFile(path.join(root, 'build-profile.json5'), 'utf8');
        assert.equal((await runInstaller({project,mode:'apply',account})).status, 'conflict');
        assert.equal(await readFile(path.join(root, 'build-profile.json5'), 'utf8'), before);
    }
    const { project, entry } = await fixture(t);
    const file = path.join(entry, 'src/main/ets/entryability/EntryAbility.ets');
    await writeFile(file, (await readFile(file,'utf8')) + '\nwindowStage.loadContent("pages/index", (err, data) => {\n});\n');
    assert.equal((await runInstaller({project,mode:'apply',account})).status, 'conflict');
});
