# CygnatCCFramework

CygnatCCFramework 是面向 Cocos Creator 的 TypeScript 游戏框架，公共能力通过命名空间统一导出。

## 从 GitHub 安装

在 Cocos Creator 项目根目录执行：

```powershell
npm install github:tyc19961996/CygnatCCFramework
```

通过 GitHub 安装时会执行 `npm run build`，包根入口从 `dist` 提供已编译的 ESM 文件和类型声明。

## 使用方式

所有公共 API 都从包根入口按命名空间访问。框架刻意不开放 `cygnat-cc-framework/UI` 等内部子路径：

```ts
import { Core, Asset, Event, UI, MiniGame, ECS, Net } from "cygnat-cc-framework";
```

示例：

```ts
Core.enableDebugMode(true);
UI.WindowManager.showWindowByName("MainWindow");
```

为了让 IDE 遵守包的 `exports` 边界，避免自动导入内部 `dist` 路径，可在业务项目的 `tsconfig.json` 中启用支持 `exports` 的模块解析：

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Cocos Creator 注意事项

运行时的 `cc` 与 `cc/env` 模块由 Cocos Creator 宿主提供。

如果需要把框架中的类直接挂到编辑器节点，建议在游戏项目的 `assets` 目录创建薄包装组件并继承框架类。Cocos Creator 通常能更稳定地扫描项目资源中的编辑器组件。

## HarmonyOS NEXT 原生广告

框架在 OPENHARMONY 上提供激励视频和插屏广告适配，业务侧仍使用统一入口：

```ts
const ads = MiniGame.MiniHelper.ad();

ads.init({
  defaultRewardAdId: "游戏自己的激励广告位",
  rewardAdIds: {
    ali_browse_task: "游戏自己的浏览任务广告位"
  },
  interstitialAdId: "游戏自己的插屏广告位"
});

ads.showRewardAd(
  { placement: MiniGame.MiniRewardAdPlacement.Default },
  {
    success: () => {
      // 只有原生端确认奖励并关闭广告后才会成功。
    },
    fail: (errCode, errMsg) => {
      console.error(errCode, errMsg);
    }
  }
);
```

原生接入必须显式执行安装器，不会通过 npm 安装钩子自动修改游戏工程。在框架包根目录执行：

```powershell
node scripts/install-harmony-ads.mjs --project <client> --check
node scripts/install-harmony-ads.mjs --project <client> --dry-run
node scripts/install-harmony-ads.mjs --project <client> --apply
```

三种模式的含义：

- `--check`：只检查接线、版本、协议和源码哈希；存在待应用改动时返回非零。
- `--dry-run`：展示将要执行的改动，不写文件。
- `--apply`：在已知的 Cocos Creator 3.8.5 HarmonyOS NEXT 模板上应用改动。

安装器把源码 HAR 复制到业务项目的 `native/extensions/cygnat-harmony-ads`，并为 entry 写入相对 `file:` 依赖、`runtimeOnly.sources` 端点、UI 请求分支和 Worker 事件队列。宿主修改都有 `cygnat-harmony-ads` 托管标记；未知模板、损坏标记、端点冲突或已安装源码被手工修改时会拒绝覆盖。

Cocos 反射端点固定为 `entry/src/main/ets/cygnat/CygnatHarmonyAdsBridge`，同步提供 `getProtocolVersion`、`submit` 和 `drainEvents`。广告位由每个游戏通过 `init` 配置，HAR 中不包含游戏包名、签名或广告位。

源码 HAR 已通过 DevEco API 24 的 `assembleHar`，真实宿主也已完成 `assembleHap`；npm tgz 离线安装后的 `apply`、`check`、重复执行和游戏消费回归均已验证。Cocos Creator 已重新生成游戏脚本，HAP 内游戏 JS 与 Creator 产物哈希一致。用户已在 nova12 Pro 真机确认激励视频和插屏可以正常展示；该结论只覆盖两类广告的展示链路，奖励发放、提前关闭、异常回调和超时恢复仍需分别验收。

## 开发与验证

安装依赖并构建：

```powershell
npm install
npm run build
```

运行完整测试：

```powershell
npm test
```

预览 npm 包最终内容：

```powershell
npm run pack:check
```
