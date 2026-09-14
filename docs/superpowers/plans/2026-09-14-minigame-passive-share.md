# MiniGame Passive Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose passive share-content registration across supported MiniGame platforms and forward WeChat's optional `imageUrlId` for active and passive shares.

**Architecture:** Define one exported share payload and callback contract in `IMiniCommon`. Platform implementations adapt this contract to their native passive-share API, forwarding only fields their SDK documents. Local SDK declaration files provide typed access without changing runtime behavior.

**Tech Stack:** TypeScript, Node.js built-in test runner, TypeScript transpilation test harness.

---

### Task 1: Define the portable sharing contract

**Files:**
- Modify: `MiniGame/interface/IMiniCommon.ts:52-63`
- Modify: `MiniGame/Base/BaseCommon.ts:164-167`
- Modify: `MiniGame/index.ts:1-15`
- Test: `tests/minigame-share.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test("BaseCommon exposes a no-op passive-share registration", () => {
  const common = new BaseCommon();
  assert.doesNotThrow(() => common.onShareAppMessage(() => ({ title: "ignored" })));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/minigame-share.test.mjs`

Expected: FAIL because `onShareAppMessage` is not a function.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface ShareAppMessageOptions {
    title?: string;
    desc?: string;
    imageUrl?: string;
    imageUrlId?: string;
    query?: string;
}

onShareAppMessage(callback: () => ShareAppMessageOptions): void;
```

Use `ShareAppMessageOptions` for `IMiniCommon.shareAppMessage` and its `BaseCommon` implementation, add BaseCommon's empty `onShareAppMessage`, and re-export the new type from `MiniGame/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/minigame-share.test.mjs`

Expected: PASS for the BaseCommon case.

### Task 2: Add type declarations and WeChat behavior

**Files:**
- Modify: `MiniGame/types/lib.wx.api.d.ts:918-940,1393-1401`
- Modify: `MiniGame/wechat/WechatCommon.ts:239-248`
- Test: `tests/minigame-share.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test("WechatCommon forwards imageUrlId to active and passive share APIs", () => {
  const common = new WechatCommon();
  common.shareAppMessage({ title: "active", imageUrlId: "approved-image" });
  common.onShareAppMessage(() => ({ title: "passive", imageUrlId: "approved-image" }));
  assert.equal(activeShare.imageUrlId, "approved-image");
  assert.equal(passiveShare().imageUrlId, "approved-image");
});

test("WechatCommon omits imageUrlId when callers do not supply it", () => {
  const common = new WechatCommon();
  common.shareAppMessage({ title: "active" });
  common.onShareAppMessage(() => ({ title: "passive" }));
  assert.equal("imageUrlId" in activeShare, false);
  assert.equal("imageUrlId" in passiveShare(), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/minigame-share.test.mjs`

Expected: FAIL because the share payload type and WeChat adapter lack `imageUrlId` and passive registration.

- [ ] **Step 3: Write minimal implementation**

Declare `imageUrlId?: string` on `WechatMiniprogram.ShareAppMessageOption`; declare `wx.onShareAppMessage(callback)` with its native callback returning that option. In `WechatCommon`, pass `imageUrlId` to `wx.shareAppMessage` only when the option contains it, and register `wx.onShareAppMessage` so its return value applies the same conditional forwarding.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/minigame-share.test.mjs`

Expected: PASS for BaseCommon and both WeChat cases.

### Task 3: Add passive-share adapters for supported non-WeChat platforms

**Files:**
- Modify: `MiniGame/types/lib.bytedance.api.d.ts:522-585,884-889`
- Modify: `MiniGame/types/lib.bilibili.api.d.ts:300-316`
- Modify: `MiniGame/bytedance/BytedanceCommon.ts:139-151`
- Modify: `MiniGame/bilibili/BilibiliCommon.ts:123-151`
- Modify: `MiniGame/alipay/AlipayCommon.ts:146-167`
- Test: `tests/minigame-share.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test("BytedanceCommon registers a passive share callback without imageUrlId", () => {
  new BytedanceCommon().onShareAppMessage(() => ({ title: "tt", imageUrlId: "wx-only", query: "from=tt" }));
  assert.deepEqual(ttPassiveShare({ channel: "" }), { title: "tt", query: "from=tt" });
});

test("BilibiliCommon registers passive sharing when the API exists", () => {
  new BilibiliCommon().onShareAppMessage(() => ({ title: "bl", imageUrlId: "wx-only" }));
  assert.deepEqual(blPassiveShare(), { title: "bl" });
});

test("BilibiliCommon tolerates a missing passive-share API", () => {
  delete globalThis.bl.onShareAppMessage;
  assert.doesNotThrow(() => new BilibiliCommon().onShareAppMessage(() => ({ title: "bl" })));
});

test("AlipayCommon maps passive sharing to its onShareAppMessage property", () => {
  new AlipayCommon().onShareAppMessage(() => ({ title: "my", imageUrlId: "wx-only" }));
  assert.deepEqual(globalThis.my.onShareAppMessage(), { title: "my" });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/minigame-share.test.mjs`

Expected: FAIL because the adapters and native API type declarations are absent.

- [ ] **Step 3: Write minimal implementation**

Add exact minimal `onShareAppMessage` declaration signatures for `tt` and `bl`. Implement each platform adapter by returning only `title`, `desc`, `imageUrl`, and `query`; do not read or forward `imageUrlId`. For Bilibili, return immediately if `bl.onShareAppMessage` is absent. For Alipay, assign `my.onShareAppMessage` to a wrapper returning those same supported fields.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/minigame-share.test.mjs`

Expected: PASS for all platform adapter cases.

### Task 4: Run regression verification

**Files:**
- Modify: none

- [ ] **Step 1: Run the full suite**

Run: `npm test`

Expected: all Node tests pass and `tsc -p tsconfig.json --noEmit` completes without diagnostics.

- [ ] **Step 2: Inspect the intended diff**

Run: `git diff --check` and `git diff -- MiniGame/interface/IMiniCommon.ts MiniGame/Base/BaseCommon.ts MiniGame/wechat/WechatCommon.ts MiniGame/bytedance/BytedanceCommon.ts MiniGame/bilibili/BilibiliCommon.ts MiniGame/alipay/AlipayCommon.ts MiniGame/types/lib.wx.api.d.ts MiniGame/types/lib.bytedance.api.d.ts MiniGame/types/lib.bilibili.api.d.ts tests/minigame-share.test.mjs`

Expected: no whitespace errors and no changes to KuaiShou sharing behavior.

## Plan self-review

- Requirement coverage: Tasks 1-3 implement the shared contract, all supported passive adapters, and WeChat-only `imageUrlId`; Task 4 verifies no regressions. KuaiShou is intentionally untouched because it lacks the requested API.
- No placeholders: every production change and test command is explicit.
- Type consistency: all tasks use `ShareAppMessageOptions` and `onShareAppMessage(callback)` consistently.
