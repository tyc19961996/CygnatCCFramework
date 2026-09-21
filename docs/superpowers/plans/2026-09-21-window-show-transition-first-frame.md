# Window Show Transition First-Frame Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a window's default scale or opacity from being rendered before its opening transition start state is applied.

**Architecture:** Keep newly instantiated windows inactive throughout asynchronous header preparation, then prepare the transition start state inside `WindowBase._show()` before activating the node. Preserve the existing public APIs and lifecycle callbacks.

**Tech Stack:** TypeScript, Cocos Creator node/tween APIs, Node.js built-in test runner.

---

## File Structure

- Create `tests/window-show-transition.test.mjs`: source-order regression coverage for the Cocos lifecycle code, which cannot execute in the plain Node.js test environment.
- Modify `UI/core/WindowGroup.ts`: keep a newly instantiated window inactive until `_show()` presents it.
- Modify `UI/window/WindowBase.ts`: apply scale/fade/no-transition initial visual state before node activation.

### Task 1: Add the first-frame regression tests

**Files:**
- Create: `tests/window-show-transition.test.mjs`
- Test: `tests/window-show-transition.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const groupSource = await readFile(path.join(process.cwd(), 'UI', 'core', 'WindowGroup.ts'), 'utf8');
const baseSource = await readFile(path.join(process.cwd(), 'UI', 'window', 'WindowBase.ts'), 'utf8');

function methodBody(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing method marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('new windows stay inactive while asynchronous header preparation is pending', () => {
  const createWindow = methodBody(groupSource, 'private async createWindow', 'private processWindowHideStatus');
  const deactivate = createWindow.indexOf('window.active = false;');
  const addChild = createWindow.indexOf('this._root.addChild(windowBase.node);');
  const requestHeader = createWindow.indexOf('await HeaderManager.requestHeader');

  assert.ok(deactivate >= 0, 'the instantiated node must be made inactive');
  assert.ok(deactivate < addChild, 'the node must be inactive before it enters the scene tree');
  assert.ok(addChild < requestHeader, 'the test must cover the asynchronous gap after addChild');
});

test('opening transition state is prepared before the window node is activated', () => {
  const show = methodBody(baseSource, 'public _show(', 'public _hide()');
  const activate = show.indexOf('this.node.active = true;');
  const scaleStart = show.indexOf('this.node.setScale(0, 0, sz);');
  const fadeStart = show.indexOf('op.opacity = 0;');
  const opacityReset = show.indexOf('op.opacity = 255;');

  assert.ok(activate >= 0, 'the window must be activated during show');
  assert.ok(scaleStart >= 0 && scaleStart < activate, 'scale start state must precede activation');
  assert.ok(fadeStart >= 0 && fadeStart < activate, 'fade start state must precede activation');
  assert.ok(opacityReset >= 0 && opacityReset < activate, 'no-transition opacity reset must precede activation');
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/window-show-transition.test.mjs`

Expected: both tests fail; the first reports that the instantiated node is not made inactive, and the second reports that a transition start state does not precede activation.

- [ ] **Step 3: Commit the failing regression tests**

```bash
git add tests/window-show-transition.test.mjs
git commit -m "test(UI): cover window transition first frame"
```

### Task 2: Keep newly created windows inactive during preparation

**Files:**
- Modify: `UI/core/WindowGroup.ts` in `createWindow()`
- Test: `tests/window-show-transition.test.mjs`

- [ ] **Step 1: Apply the minimal creation-path fix**

Immediately after instantiation, deactivate the raw node before retrieving and initializing `WindowBase`:

```ts
const window = instantiate(prefab);
window.active = false;
const windowBase = window.getComponent(WindowBase);
```

- [ ] **Step 2: Run the targeted test and verify the creation-path assertion is GREEN**

Run: `node --test tests/window-show-transition.test.mjs`

Expected: the creation-path test passes; the `_show()` ordering test still fails.

### Task 3: Prepare the transition before activation

**Files:**
- Modify: `UI/window/WindowBase.ts` in `_show()`
- Test: `tests/window-show-transition.test.mjs`

- [ ] **Step 1: Move activation after visual-state preparation**

Keep `_stopUiTweens()` first. Remove the current early activation, retain transition/base-scale calculation and all three visual-state branches, then activate immediately before `onShow()`:

```ts
public _show(userdata?: T, transition?: IWindowTransitionOptions): void {
    this._stopUiTweens();

    const kind = transition?.kind ?? WindowTransitionKind.None;
    const dur = this._transitionDuration(transition);

    this._captureBaseScale();

    const sx = this._baseScale.x;
    const sy = this._baseScale.y;
    const sz = this._baseScale.z;

    if (kind === WindowTransitionKind.Scale) {
        this.node.setScale(0, 0, sz);
    } else if (kind === WindowTransitionKind.Fade) {
        const op = this._ensureUiOpacity();
        op.opacity = 0;
    } else {
        const op = this.node.getComponent(UIOpacity);
        if (op) {
            op.opacity = 255;
        }
    }

    this.node.active = true;
    this.onShow(userdata);

    if (kind === WindowTransitionKind.Scale) {
        tween(this.node)
            .to(dur, { scale: v3(sx, sy, sz) }, { easing: 'backOut' })
            .start();
    } else if (kind === WindowTransitionKind.Fade) {
        const op = this._ensureUiOpacity();
        tween(op).to(dur, { opacity: 255 }).start();
    }
}
```

- [ ] **Step 2: Run the targeted test and verify GREEN**

Run: `node --test tests/window-show-transition.test.mjs`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 3: Run the full verification suite**

Run: `npm test`

Expected: all Node.js tests pass and `tsc -p tsconfig.json --noEmit` exits successfully.

- [ ] **Step 4: Inspect the change set**

Run: `git diff --check` and `git diff -- UI/core/WindowGroup.ts UI/window/WindowBase.ts tests/window-show-transition.test.mjs`

Expected: no whitespace errors and no changes outside the specified first-frame fix.

- [ ] **Step 5: Commit the implementation**

```bash
git add UI/core/WindowGroup.ts UI/window/WindowBase.ts
git commit -m "fix(UI): prepare window transition before activation"
```
