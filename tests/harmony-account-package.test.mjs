import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('发布包包含登录原生源码、独立安装器及已有广告安装器新增依赖', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8'));
    for (const file of ['native/harmonyos-next', 'scripts/install-harmony-account.mjs', 'scripts/harmony-account-installation.mjs', 'docs/harmony-account.md']) {
        assert.ok(pkg.files.includes(file), file);
    }
    assert.deepEqual(Object.keys(pkg.exports).sort(), ['.', './package.json']);
    const doc = await readFile('docs/harmony-account.md', 'utf8');
    assert.match(doc, /Game Service/); assert.match(doc, /bizID/); assert.match(doc, /Client Secret/);
    const worker = await readFile('native/harmonyos-next/cygnat-harmony-ads/Worker.ts', 'utf8');
    assert.doesNotMatch(worker, /HarmonyAccountService|@kit\./);
    assert.match(worker, /HarmonyAccountWorkerQueue/);
});
