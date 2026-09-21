# Window Show Transition First-Frame Design

## Problem

When a newly loaded window uses a scale or fade opening transition, its prefab node can become renderable before `WindowBase._show()` applies the transition's initial visual state. `WindowGroup.createWindow()` adds the active prefab node to the active window-group root and then awaits header loading. During that asynchronous gap, the default prefab state (for example, scale `1`) may be rendered for one frame.

The same ordering issue exists in `WindowBase._show()`: the node is activated before the scale or opacity start value is applied.

## Design

Use visibility ordering to guarantee that no renderable frame exists before the transition start state is ready:

1. In `WindowGroup.createWindow()`, make the instantiated window node inactive before adding it to the window-group root.
2. Keep the node inactive during initialization, adaptation, registration, and asynchronous header preparation.
3. In `WindowBase._show()`, stop existing UI tweens, determine the transition, capture the window's base scale, and apply the transition start state while the node is inactive.
4. Activate the node only after its initial scale or opacity is ready.
5. Invoke `onShow()` and start the opening tween as before.

No public API or transition configuration changes are required.

## Lifecycle Behavior

- For a scale transition, the first renderable state is scale `(0, 0, baseScale.z)`.
- For a fade transition, the first renderable state has opacity `0`.
- For no transition, any existing `UIOpacity` is restored to `255` before activation.
- `onShow()` still runs after the node is active.
- Component `onEnable()` callbacks will observe the prepared transition start state rather than the prefab's final visual state.

## Scope

The change is limited to `WindowGroup.createWindow()` and `WindowBase._show()`. Header behavior, window stacking, close transitions, public interfaces, and prefab authoring conventions remain unchanged.

## Verification

Add a regression test or test harness that records state ordering and demonstrates the current failure first:

- A newly created window remains inactive while header preparation is pending.
- A scale transition applies scale `0` before activation.
- A fade transition applies opacity `0` before activation.
- A no-transition show restores opacity before activation.

Then run the project's available type-check/build/tests and inspect the final diff for unrelated changes.
