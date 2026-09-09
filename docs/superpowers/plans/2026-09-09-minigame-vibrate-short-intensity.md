# Mini-game Short-vibration Intensity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow callers to choose `heavy`, `medium`, or `light` for short vibration while preserving `medium` for omitted arguments.

**Architecture:** `IMiniCommon` owns the shared strength union and optional method parameter. Each common adapter defaults that parameter to `medium`; WeChat, Kuaishou, Bilibili, and Alipay forward it to their native options object, while ByteDance accepts but ignores it. The local WeChat declaration gains an options interface matching its documented API.

**Tech Stack:** TypeScript 5, Cocos Creator framework, Node test runner.

---

## File structure

- `MiniGame/interface/IMiniCommon.ts`: Shared `VibrateShortType` and the public short-vibration signature.
- `MiniGame/index.ts`: Package-level re-export of the public strength type.
- `MiniGame/types/lib.wx.api.d.ts`: WeChat short-vibration options declaration and method signature.
- `MiniGame/Base/BaseCommon.ts`: No-op fallback preserving the common signature.
- `MiniGame/wechat/WechatCommon.ts`: Forward strength to `wx.vibrateShort`.
- `MiniGame/kuaishou/KuaiShouCommon.ts`: Forward strength while retaining failure logging.
- `MiniGame/bilibili/BilibiliCommon.ts`: Forward strength while retaining failure logging.
- `MiniGame/alipay/AlipayCommon.ts`: Forward strength to Alipay.
- `MiniGame/bytedance/BytedanceCommon.ts`: Accept and ignore strength because the platform API has no type field.
- `tests/minigame-vibrate-short.typecheck.ts`: Compile-time public API contract fixture.

### Task 1: Establish the failing public API contract

**Files:**
- Create: `tests/minigame-vibrate-short.typecheck.ts`

- [ ] **Step 1: Write the failing type-check fixture**

```ts
import { IMiniCommon, VibrateShortType } from "../MiniGame";

declare const common: IMiniCommon;

const defaultType: VibrateShortType = "medium";
const lightType: VibrateShortType = "light";
const heavyType: VibrateShortType = "heavy";

common.vibrateShort();
common.vibrateShort(defaultType);
common.vibrateShort(lightType);
common.vibrateShort(heavyType);

// @ts-expect-error Only documented vibration intensities are accepted.
common.vibrateShort("strong");
```

- [ ] **Step 2: Run the fixture to verify it fails**

Run: `npx tsc -p tsconfig.json --noEmit`

Expected: FAIL because `VibrateShortType` is not exported and `vibrateShort` currently accepts no argument.

### Task 2: Define and export the shared contract

**Files:**
- Modify: `MiniGame/interface/IMiniCommon.ts:45-170`
- Modify: `MiniGame/index.ts:4-12`
- Modify: `MiniGame/types/lib.wx.api.d.ts:7-24, 1397-1402`
- Modify: `MiniGame/wechat/WechatCommon.ts:9, 121-123`
- Test: `tests/minigame-vibrate-short.typecheck.ts`

- [ ] **Step 1: Add the shared union and optional parameter**

In `MiniGame/interface/IMiniCommon.ts`, add the exported type immediately before `IMiniCommon` and replace the method declaration:

```ts
export type VibrateShortType = "heavy" | "medium" | "light";

// Within IMiniCommon
vibrateShort(type?: VibrateShortType): void;
```

- [ ] **Step 2: Re-export the strength type from the MiniGame package**

Add `VibrateShortType` to the existing `export type { ... } from './interface/IMiniCommon';` block in `MiniGame/index.ts`:

```ts
export type {
    IMiniCommon,
    VibrateShortType,
    TouchPoint,
    TouchData,
    LoginResult,
    SubscribeResult,
    ReportSceneOptions,
} from './interface/IMiniCommon';
```

- [ ] **Step 3: Correct the bundled WeChat API declaration**

In the `WechatMiniprogram` namespace, add this interface after `ICommonCallBack`:

```ts
interface VibrateShortOption extends ICommonCallBack {
    /** 震动强度类型，基础库 2.13.0 起支持。 */
    type: "heavy" | "medium" | "light";
}
```

Replace the no-argument declaration with:

```ts
vibrateShort(options: VibrateShortOption): void;
```

- [ ] **Step 4: Update the WeChat adapter in the same type-check unit**

Import `VibrateShortType` from `../interface/IMiniCommon` in
`MiniGame/wechat/WechatCommon.ts` and replace the no-argument native call:

```ts
public vibrateShort(type: VibrateShortType = "medium"): void {
    wx.vibrateShort({ type });
}
```

This is part of the contract task because the corrected WeChat declaration has
a required native `type` field.

- [ ] **Step 5: Run the type-check fixture to verify it passes**

Run: `npx tsc -p tsconfig.json --noEmit`

Expected: PASS, including acceptance of the three legal values and enforcement of the `@ts-expect-error` line.

- [ ] **Step 6: Commit the public contract and WeChat adapter**

```bash
git add MiniGame/interface/IMiniCommon.ts MiniGame/index.ts MiniGame/types/lib.wx.api.d.ts MiniGame/wechat/WechatCommon.ts tests/minigame-vibrate-short.typecheck.ts
git commit -m "feat: expose short vibration intensity type"
```

### Task 3: Forward the intensity in each adapter

**Files:**
- Modify: `MiniGame/Base/BaseCommon.ts:8, 157-159`
- Modify: `MiniGame/kuaishou/KuaiShouCommon.ts:9, 109-120`
- Modify: `MiniGame/bilibili/BilibiliCommon.ts:9, 103-111`
- Modify: `MiniGame/alipay/AlipayCommon.ts:9, 134-137`
- Modify: `MiniGame/bytedance/BytedanceCommon.ts:9, 91-93`
- Test: `tests/minigame-vibrate-short.typecheck.ts`

- [ ] **Step 1: Update imports and defaulted adapter signatures**

Import `VibrateShortType` from `../interface/IMiniCommon` in each of the five files. Use this signature in every adapter, naming the unused ByteDance and base parameters `_type`:

```ts
public vibrateShort(type: VibrateShortType = "medium"): void {
```

```ts
public vibrateShort(_type: VibrateShortType = "medium"): void {
```

- [ ] **Step 2: Forward the type on platforms with native support**

Use the parameter in each supported adapter while keeping the existing callback behavior:

```ts
// Kuaishou
ks.vibrateShort({
    type,
    fail: (res: KuaiShouFailResult) => {
        Warn(`快手短震动失败 ${this.getErrorMessage(res)}`);
    }
});

// Bilibili
bl.vibrateShort?.({
    type,
    fail: (res) => {
        Warn(`Bilibili 短震动失败 ${this.getErrorMessage(res)}`);
    }
});

// Alipay
my.vibrateShort?.({ type });
```

- [ ] **Step 3: Keep ByteDance behavior parameterless**

Leave the existing native invocation unchanged and use `_type` only to satisfy the common contract:

```ts
public vibrateShort(_type: VibrateShortType = "medium"): void {
    tt.vibrateLong();
}
```

- [ ] **Step 4: Run the complete test suite**

Run: `npm test`

Expected: PASS for all existing Node tests.

- [ ] **Step 5: Build the distributable package**

Run: `npm run build`

Expected: PASS; declaration output contains the optional `VibrateShortType` parameter and the build helper scripts complete without errors.

- [ ] **Step 6: Inspect generated declaration output**

Run: `rg -n "VibrateShortType|vibrateShort\(type\?" dist/MiniGame`

Expected: The public declaration exports `VibrateShortType` and declares `vibrateShort(type?: VibrateShortType): void`.

- [ ] **Step 7: Commit the adapter changes**

```bash
git add MiniGame/Base/BaseCommon.ts MiniGame/kuaishou/KuaiShouCommon.ts MiniGame/bilibili/BilibiliCommon.ts MiniGame/alipay/AlipayCommon.ts MiniGame/bytedance/BytedanceCommon.ts
git commit -m "feat: forward short vibration intensity"
```
