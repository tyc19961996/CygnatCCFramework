# Mini-game short-vibration intensity design

## Goal

Allow game code to select the intensity used by a mini-game platform's short
vibration. Supported values are `"heavy"`, `"medium"`, and `"light"`. Calls
that omit the intensity must retain the current `"medium"` behavior.

## Public API

`IMiniCommon` will export a `VibrateShortType` string union and expose:

```ts
vibrateShort(type?: VibrateShortType): void;
```

Every concrete implementation will use `"medium"` as its default parameter.
This keeps existing zero-argument calls source-compatible while making invalid
strength values a TypeScript error.

## Platform behavior

| Platform | Native call |
| --- | --- |
| WeChat | `wx.vibrateShort({ type })` |
| Kuaishou | `ks.vibrateShort({ type, fail })` |
| Bilibili | `bl.vibrateShort({ type, fail })` |
| Alipay | `my.vibrateShort({ type })` |
| ByteDance | Continue the platform's parameterless short-vibration call; accept and ignore `type` at the framework boundary. |
| Base fallback | Accept the optional value and perform no operation. |

The bundled WeChat declaration will be updated to model the object argument and
its required `type` field. This matches the current official API, where the
strength field is available from base library 2.13.0.

## Errors and compatibility

Existing platform failure callbacks remain unchanged. No feature detection or
fallback is added: the behavior stays consistent with the current adapters.
Applications targeting WeChat base libraries older than 2.13.0 remain
responsible for their own platform compatibility policy.

## Verification

Add a TypeScript type-check fixture covering a default invocation, all three
valid values, and a rejected invalid value. Run the repository test suite and
the production TypeScript build.
