# ByteDance vibration mapping design

## Goal

Correct the ByteDance mini-game adapter so its framework short- and
long-vibration methods call native APIs with the corresponding duration.

## Behavior

`BytedanceCommon.vibrateShort` will call `tt.vibrateShort`, while
`BytedanceCommon.vibrateLong` will call `tt.vibrateLong`. The existing optional
short-vibration intensity parameter remains accepted and ignored because the
ByteDance native API has no matching `type` field.

## Scope

The change is limited to the two native calls in `BytedanceCommon` and a
regression test that verifies their mapping. No changes are made to other
platform adapters, public method signatures, or vibration error handling.

## Verification

The regression test will dynamically transpile the adapter source with its
runtime imports replaced by local stubs, then invoke each method against a
mocked `tt` API. It will assert that only the corresponding native method is
called. The standard test suite, TypeScript type check, and package build will
then run.
