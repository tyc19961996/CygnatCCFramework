import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("npm package publishes Harmony native source and installer", async () => {
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    assert.ok(packageJson.files.includes("native/harmonyos-next"));
    assert.ok(packageJson.files.includes("scripts/install-harmony-ads.mjs"));

    const readme = await readFile(path.join(root, "README.md"), "utf8");
    assert.match(readme, /install-harmony-ads\.mjs --project <client> --check/);
    assert.match(readme, /install-harmony-ads\.mjs --project <client> --dry-run/);
    assert.match(readme, /install-harmony-ads\.mjs --project <client> --apply/);
    assert.match(readme, /native\/extensions\/cygnat-harmony-ads/);
    assert.match(readme, /真机/);
});
