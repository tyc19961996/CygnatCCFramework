# ByteDance Vibration Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the ByteDance adapter so short and long framework calls invoke their matching native vibration APIs.

**Architecture:** A focused Node regression test dynamically transpiles `BytedanceCommon` after replacing its runtime imports with stubs. It supplies a minimal `tt` mock, instantiates the adapter, and records native vibration calls. The production fix only exchanges the two incorrectly mapped native method invocations.

**Tech Stack:** TypeScript 5 compiler API, Node.js built-in test runner.

---

## File structure

- `tests/bytedance-vibration.test.mjs`: Runtime regression test for the adapter-to-native vibration mapping.
- `MiniGame/bytedance/BytedanceCommon.ts`: Correct the two native vibration calls.

### Task 1: Prove the current mapping is reversed

**Files:**
- Create: `tests/bytedance-vibration.test.mjs`

- [ ] **Step 1: Write the failing runtime regression test**

Create a Node test that reads `MiniGame/bytedance/BytedanceCommon.ts`, replaces:

```ts
import { Log, Utils, Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
```

with:

```ts
const Log = () => undefined;
const Utils = {};
const Warn = () => undefined;
class BaseCommon {}
```

Transpile the transformed source with `typescript.transpileModule`, then import
it via a `data:` URL. Before constructing `BytedanceCommon`, set
`globalThis.tt` to a mock with `getLaunchOptionsSync`, `vibrateShort`, and
`vibrateLong`. Each vibration function appends its name to a `calls` array.

Write two tests using the imported class:

```js
instance.vibrateShort();
assert.deepEqual(calls, ["short"]);
```

```js
instance.vibrateLong();
assert.deepEqual(calls, ["long"]);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/bytedance-vibration.test.mjs`

Expected: FAIL. `vibrateShort()` records `"long"`, and `vibrateLong()` records
`"short"`.

### Task 2: Correct the native mapping

**Files:**
- Modify: `MiniGame/bytedance/BytedanceCommon.ts:87-93`
- Test: `tests/bytedance-vibration.test.mjs`

- [ ] **Step 1: Swap only the incorrectly mapped native calls**

Replace the two method bodies with:

```ts
public vibrateLong(): void {
    tt.vibrateLong();
}

public vibrateShort(_type: VibrateShortType = "medium"): void {
    tt.vibrateShort();
}
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `node --test tests/bytedance-vibration.test.mjs`

Expected: PASS. The short call records only `"short"`; the long call records
only `"long"`.

- [ ] **Step 3: Run all project verification**

Run: `npm test`

Expected: PASS; this runs all Node tests and `tsc -p tsconfig.json --noEmit`.

Run: `npm run build`

Expected: PASS; package JavaScript and declarations are generated successfully.

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Leave changes uncommitted for user review**

Do not run `git add` or `git commit`. The user explicitly requested review of
the combined changes before any commit.
