# Window Group Swallow Layer Design

## Problem

`WindowBase` currently creates a full-screen `swallow` node as a child of the window root. A scale transition transforms the entire window root, so the swallow node scales with it and no longer covers the screen. Touches outside the scaled area can then reach lower windows and UI.

Moving the swallow node outside the animated window introduces another concern: the shared `_alphaGraph`, group swallow nodes, windows, and headers all occupy the same group roots and modify sibling indices. Independent layer adjustment methods would invalidate each other's cached indices.

## Design

Each `WindowGroup` owns one full-screen `swallowGraph` instead of every `WindowBase` owning a swallow child. The group-level node does not inherit a window's transition transform. When swallowing is enabled and the group contains windows, it is placed immediately below that group's top window, allowing the top window to receive input while preventing all lower UI from receiving it.

`WindowManager` provides one overlay-layer orchestration entry point. Window stack mutations must complete before it runs. The orchestration adjusts layers in this order:

1. Position the shared `_alphaGraph` below the highest window that requires a background alpha.
2. Position each active group's `swallowGraph` immediately below that group's top window, reading the window's current sibling index after `_alphaGraph` has moved.
3. Reposition active headers last so they remain above their associated visible windows and overlay nodes.

No overlay adjustment may retain a sibling index across another node move.

## Required Ordering

When `_alphaGraph` and `swallowGraph` target the same top window, the bottom-to-top order is:

```text
lower windows
_alphaGraph
swallowGraph
top window
header
```

The swallow and alpha targets are selected independently. `_alphaGraph` follows the highest window with `bgAlpha > 0`; a `swallowGraph` follows the top window of its own swallow-enabled group. They remain separate nodes because those targets can differ.

## Components

### `WindowGroup`

- Create and own one `swallowGraph` when `swallowTouch` is enabled.
- Give it a `UITransform` sized to the current screen and a `BlockInputEvents` component.
- Expose an internal method that updates its size.
- Expose an internal method that positions it immediately below the current top window or hides it when the group is empty or swallowing is disabled.
- Remove the per-window swallow-node creation and adaptation responsibility from `WindowBase`.

### `WindowManager`

- Replace scattered overlay ordering with one `adjustOverlayLayers()` method.
- Keep alpha placement as the first overlay operation.
- Ask every group to position its swallow node after alpha placement.
- Ask `HeaderManager` to refresh header depth last.
- Resize group swallow nodes from `onScreenResize()`.

### `HeaderManager`

- Provide an internal method that recalculates positions for all active/cached headers without changing their user data or visibility state.

## Lifecycle Integration

Call `adjustOverlayLayers()` after operations that can change the active window stack or sibling order, including showing, closing, replacing, and closing all windows. Existing header show/hide/release operations continue to manage header state; the centralized pass only normalizes final depth.

## Compatibility

- Public window APIs and transition options remain unchanged.
- Existing prefabs need no new content node or hierarchy convention.
- `swallowTouch` remains configured per `CocosWindowContainer`/`WindowGroup`.
- Scale and fade transitions continue to target the window root.

## Verification

Regression coverage will verify:

- `WindowBase` no longer creates a swallow child.
- A swallow-enabled `WindowGroup` creates one unscaled full-screen blocker.
- Alpha placement runs before swallow placement, and header depth refresh runs last.
- Swallow placement obtains the top window's sibling index at placement time.
- Empty groups do not leave an active blocker.
- The complete Node test suite and TypeScript type check pass.
