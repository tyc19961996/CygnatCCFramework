import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("npm package publishes Harmony native source and installer", async () => {
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    assert.ok(packageJson.files.includes("native/harmonyos-next"));
    assert.ok(packageJson.files.includes("scripts/install-harmony-ads.mjs"));
    assert.ok(packageJson.files.includes("docs/harmony-ads.md"));

    const readme = await readFile(path.join(root, "README.md"), "utf8");
    assert.match(readme, /\[鸿蒙 NEXT 广告使用指南\]\(docs\/harmony-ads\.md\)/);
    assert.match(readme, /install-harmony-ads\.mjs --project <client> --check/);
    assert.match(readme, /install-harmony-ads\.mjs --project <client> --dry-run/);
    assert.match(readme, /install-harmony-ads\.mjs --project <client> --apply/);
    assert.match(readme, /native\/extensions\/cygnat-harmony-ads/);
    assert.match(readme, /真机/);

    const guide = await readFile(path.join(root, "docs", "harmony-ads.md"), "utf8");
    assert.match(guide, /testx9dtjwj8hp/);
    assert.match(guide, /testb4znbuh3n2/);
    assert.match(guide, /node_modules\/cygnat-cc-framework\/scripts\/install-harmony-ads\.mjs --project \. --dry-run/);
    assert.match(guide, /ohpm install/);
});
