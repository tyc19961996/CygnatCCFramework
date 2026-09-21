# Window Group Swallow Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep lower UI untouchable during window scale transitions by moving touch swallowing outside the animated window and deterministically ordering all overlay nodes.

**Architecture:** Each swallow-enabled `WindowGroup` owns one full-screen `swallowGraph` positioned directly below its top window. `WindowManager.adjustOverlayLayers()` performs alpha placement first, group swallow placement second, and header depth normalization last so no layer operation relies on a stale sibling index.

**Tech Stack:** TypeScript, Cocos Creator `Node`/`UITransform`/`BlockInputEvents`, Node.js built-in test runner.

---

## File Structure

- Create `tests/window-swallow-layer.test.mjs`: source-structure regression coverage for ownership and overlay ordering in code that depends on the Cocos runtime.
- Modify `UI/window/WindowBase.ts`: remove the per-window swallow child and its adaptation logic.
- Modify `UI/core/WindowGroup.ts`: own, resize, activate, and position one group-level swallow node.
- Modify `UI/core/WindowManager.ts`: resize group blockers and centralize overlay adjustment.
- Modify `UI/core/HeaderManager.ts`: expose a depth-only refresh for cached headers.

### Task 1: Add failing ownership and ordering regression tests

**Files:**
- Create: `tests/window-swallow-layer.test.mjs`
- Test: `tests/window-swallow-layer.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const readSource = (relativePath) => readFile(path.join(process.cwd(), ...relativePath), 'utf8');
const [windowBaseSource, windowGroupSource, windowManagerSource, headerManagerSource] = await Promise.all([
  readSource(['UI', 'window', 'WindowBase.ts']),
  readSource(['UI', 'core', 'WindowGroup.ts']),
  readSource(['UI', 'core', 'WindowManager.ts']),
  readSource(['UI', 'core', 'HeaderManager.ts']),
]);

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing section marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing section end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('the animated window no longer owns the full-screen swallow node', () => {
  const init = section(windowBaseSource, 'public _init(', 'public _adapted()');
  const adapted = section(windowBaseSource, 'public _adapted()', 'private _captureBaseScale');

  assert.doesNotMatch(init, /BlockInputEvents|this\.node\.addChild\(bgNode\)|_swallowNode/);
  assert.doesNotMatch(adapted, /_swallowNode/);
});

test('a window group owns one inactive full-screen swallow graph', () => {
  const constructor = section(windowGroupSource, 'constructor(', 'public async showWindow');

  assert.match(windowGroupSource, /private _swallowGraph: Node = null;/);
  assert.match(constructor, /new Node\("swallow"\)/);
  assert.match(constructor, /addComponent\(UITransform\)/);
  assert.match(constructor, /addComponent\(BlockInputEvents\)/);
  assert.match(constructor, /this\._root\.addChild\(this\._swallowGraph\)/);
  assert.match(constructor, /this\._swallowGraph\.active = false;/);
});

test('swallow placement reads the current top-window index and hides for an empty group', () => {
  const adjust = section(windowGroupSource, 'public adjustSwallowGraph()', 'public async showWindow');

  assert.match(adjust, /if \(!this\._swallowGraph \|\| this\.size === 0\)/);
  assert.match(adjust, /this\._swallowGraph\.active = false;/);
  assert.match(adjust, /const windowIndex = windowNode\.getSiblingIndex\(\);/);
  assert.match(adjust, /this\._swallowGraph\.setSiblingIndex\(newIndex\);/);
});

test('overlay adjustment always runs alpha, swallow, then header depth', () => {
  const adjust = section(windowManagerSource, 'public static adjustOverlayLayers()', 'public static releaseUnusedRes');
  const alpha = adjust.indexOf('this.adjustAlphaGraph();');
  const swallow = adjust.indexOf('group.adjustSwallowGraph();');
  const header = adjust.indexOf('HeaderManager.adjustHeaderDepths();');

  assert.ok(alpha >= 0, 'alpha graph adjustment is required');
  assert.ok(swallow > alpha, 'swallow graphs must move after the alpha graph');
  assert.ok(header > swallow, 'headers must be normalized after all overlay nodes');
  assert.match(headerManagerSource, /public static adjustHeaderDepths\(\): void/);
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/window-swallow-layer.test.mjs`

Expected: all four tests fail because `WindowBase` still owns the blocker and the group/centralized overlay APIs do not exist.

- [ ] **Step 3: Commit the failing regression tests**

```bash
git add tests/window-swallow-layer.test.mjs
git commit -m "test(UI): cover group-level swallow layer ordering"
```

### Task 2: Move swallow ownership from windows to groups

**Files:**
- Modify: `UI/window/WindowBase.ts`
- Modify: `UI/core/WindowGroup.ts`
- Test: `tests/window-swallow-layer.test.mjs`

- [ ] **Step 1: Remove the per-window blocker**

In `WindowBase.ts`, remove `BlockInputEvents`, `Layout`, and `warn` from the `cc` import; remove `_swallowNode`; remove the injected `bgNode` and root-`Layout` warning from `_init()`; and remove swallow sizing/positioning from `_adapted()`. Keep `_init(swallowTouch: boolean)` unchanged for internal API compatibility and mark the parameter as intentionally unused:

```ts
public _init(_swallowTouch: boolean): void {
    this._isTop = true;
    this.bgAlpha = WindowManager.bgAlpha;
    this._captureBaseScale();
    this.onInit();
    this._basePosition.set(this.node.position.x, this.node.position.y, this.node.position.z);
}
```

- [ ] **Step 2: Add group-level blocker ownership and resizing**

Update `WindowGroup.ts` imports to include `BlockInputEvents`, `Size`, and `UITransform`, and import `Screen`. Add the field and initialize it only for swallow-enabled groups:

```ts
private _swallowGraph: Node = null;

constructor(name: string, root: Node, ignoreQuery: boolean, swallowTouch: boolean) {
    this._name = name;
    this._root = root;
    this._ignore = ignoreQuery;
    this._swallowTouch = swallowTouch;
    this._windowNames = [];

    if (this._swallowTouch) {
        this._swallowGraph = new Node("swallow");
        this._swallowGraph.addComponent(UITransform);
        this._swallowGraph.addComponent(BlockInputEvents);
        this._swallowGraph.active = false;
        this._root.addChild(this._swallowGraph);
        this.onScreenResize();
    }
}

public onScreenResize(): void {
    const transform = this._swallowGraph?.getComponent(UITransform);
    transform?.setContentSize(new Size(Screen.ScreenWidth, Screen.ScreenHeight));
}
```

- [ ] **Step 3: Add stable placement immediately below the current top window**

```ts
public adjustSwallowGraph(): void {
    if (!this._swallowGraph || this.size === 0) {
        if (this._swallowGraph) {
            this._swallowGraph.active = false;
        }
        return;
    }

    const topWindow = this.getTopWindow<WindowBase>();
    const windowNode = topWindow?.node;
    if (!windowNode || windowNode.parent !== this._root) {
        this._swallowGraph.active = false;
        return;
    }

    const windowIndex = windowNode.getSiblingIndex();
    const swallowIndex = this._swallowGraph.getSiblingIndex();
    const newIndex = swallowIndex >= windowIndex ? windowIndex : windowIndex - 1;
    this._swallowGraph.setSiblingIndex(newIndex);
    this._swallowGraph.active = true;
}
```

- [ ] **Step 4: Run the targeted test**

Run: `node --test tests/window-swallow-layer.test.mjs`

Expected: the ownership and placement tests pass; the centralized overlay-order test still fails.

### Task 3: Centralize overlay ordering

**Files:**
- Modify: `UI/core/WindowManager.ts`
- Modify: `UI/core/WindowGroup.ts`
- Modify: `UI/core/HeaderManager.ts`
- Test: `tests/window-swallow-layer.test.mjs`

- [ ] **Step 1: Add a header depth-only refresh**

Add this public internal method to `HeaderManager`:

```ts
public static adjustHeaderDepths(): void {
    for (const [headerName, windowName] of this._cacheHeaderTopWindow) {
        if (!this._headers.has(headerName) || !WindowManager.getWindow(windowName)) {
            continue;
        }
        this.adjustHeaderPosition(headerName, windowName);
    }
}
```

- [ ] **Step 2: Add the centralized overlay pass**

Add to `WindowManager` after `adjustAlphaGraph()`:

```ts
public static adjustOverlayLayers(): void {
    this.adjustAlphaGraph();
    for (const group of this._groups.values()) {
        group.adjustSwallowGraph();
    }
    HeaderManager.adjustHeaderDepths();
}
```

In `onScreenResize()`, call `group.onScreenResize()` for every group before adapting its windows.

- [ ] **Step 3: Route stack mutations through the centralized pass**

Replace direct `WindowManager.adjustAlphaGraph()` calls with `WindowManager.adjustOverlayLayers()` in `WindowGroup.showAdjustment()` and the `WindowManager.closeWindowByName()` cleanup callback. At the end of `WindowManager.closeAllWindow()`, call `this.adjustOverlayLayers()` after the new top-window state is updated.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node --test tests/window-swallow-layer.test.mjs`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Run the previous transition regression test**

Run: `node --test tests/window-show-transition.test.mjs`

Expected: 2 tests pass, 0 fail.

### Task 4: Verify and commit the implementation

**Files:**
- Modify: `UI/window/WindowBase.ts`
- Modify: `UI/core/WindowGroup.ts`
- Modify: `UI/core/WindowManager.ts`
- Modify: `UI/core/HeaderManager.ts`
- Test: `tests/window-swallow-layer.test.mjs`

- [ ] **Step 1: Run the complete verification suite**

Run: `npm test`

Expected: all Node.js tests pass and `tsc -p tsconfig.json --noEmit` exits successfully.

- [ ] **Step 2: Inspect the final change set**

Run: `git diff --check` and `git diff -- UI/window/WindowBase.ts UI/core/WindowGroup.ts UI/core/WindowManager.ts UI/core/HeaderManager.ts tests/window-swallow-layer.test.mjs`

Expected: no whitespace errors and no unrelated changes.

- [ ] **Step 3: Commit the implementation**

```bash
git add UI/window/WindowBase.ts UI/core/WindowGroup.ts UI/core/WindowManager.ts UI/core/HeaderManager.ts
git commit -m "fix(UI): keep window-group swallow layer unscaled"
```
