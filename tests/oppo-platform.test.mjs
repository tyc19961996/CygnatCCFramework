import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const platformSource = await readFile("Core/engine/Platform.ts", "utf8");
const helperSource = await readFile("MiniGame/MiniHelper.ts", "utf8");

test("Platform recognizes the OPPO mini-game runtime", () => {
    assert.match(platformSource, /Oppo\s*=\s*\d+/);
    assert.match(platformSource, /isOppo/);
    assert.match(platformSource, /sys\.Platform\.OPPO_MINI_GAME/);
});

test("MiniHelper selects OPPO common and ads adapters", () => {
    assert.match(helperSource, /OppoCommon/);
    assert.match(helperSource, /OppoAds/);
    assert.match(helperSource, /Platform\.isOppo/);
});
