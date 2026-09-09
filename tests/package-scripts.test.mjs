import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("npm test runs the project type check", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

    assert.equal(pkg.scripts.test, "node --test && tsc -p tsconfig.json --noEmit");
});
