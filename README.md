# CygnatCCFramework

Cocos Creator TypeScript game framework.

## Install From GitHub

Install it in a Cocos Creator project root:

```powershell
npm install github:tyc19961996/CygnatCCFramework
```

The package runs `npm run build` during GitHub installation and exposes the compiled ESM files from `dist`.

## Usage

Import the framework entry:

```ts
import { Core, Assets, Event, UI, MiniGame, Ecs } from "cygnat-cc-framework";
```

Or import a top-level module:

```ts
import * as Core from "cygnat-cc-framework/Core";
import * as Net from "cygnat-cc-framework/Net";
import * as UI from "cygnat-cc-framework/UI";
```

Example:

```ts
Core.enableDebugMode(true);
```

## Cocos Creator Notes

This package expects Cocos Creator to provide the runtime modules `cc` and `cc/env`.

If a class from this package needs to be attached directly as a Cocos component in the editor, prefer creating a thin wrapper script under your game's `assets` directory and extending the framework class there. Cocos Creator projects usually scan project assets more predictably than package internals for editor component registration.

## Development

Build the package:

```powershell
npm install
npm run build
```

Preview the npm package contents:

```powershell
npm run pack:check
```
