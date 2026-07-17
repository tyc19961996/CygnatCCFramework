# CygnatCCFramework

Cocos Creator TypeScript game framework.

## Install From GitHub

Install it in a Cocos Creator project root:

```powershell
npm install github:tyc19961996/CygnatCCFramework
```

The package runs `npm run build` during GitHub installation and exposes the compiled ESM files from `dist`.

## Usage

Import the framework entry. All public APIs are accessed through the module namespaces — subpath imports (e.g. `cygnat-cc-framework/UI`) are intentionally not exposed:

```ts
import { Core, Asset, Event, UI, MiniGame, ECS, Net } from "cygnat-cc-framework";
```

Example:

```ts
Core.enableDebugMode(true);
UI.WindowManager.showWindowByName("MainWindow");
```

To make the IDE respect the package encapsulation (no auto-import of internal `dist` paths), set an `exports`-aware module resolution in the consuming project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
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
