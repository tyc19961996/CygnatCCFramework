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

## OPPO 原生模板广告

MiniGame 提供激励视频、插屏、Banner 和原生模板四类广告接口；具体支持情况取决于平台，原生模板目前仅 OPPO 实现，其他平台调用时明确返回失败。

```ts
import { MiniGame } from "cygnat-cc-framework";

const ads = MiniGame.MiniHelper.ad();
// 与其他广告一起初始化；再次 init 会释放现有模板实例。
ads.init({ nativeTemplateAdId: "游戏自己的 OPPO 模板广告位" });
ads.setNativeTemplateAdsListener({
  onLoad: () => console.log("模板加载成功"),
  onShow: () => console.log("模板已显示"),
  onHide: () => console.log("模板已隐藏或被用户关闭"),
  onClick: (event) => console.log("模板点击", event.code, event.msg),
  onError: (code, message) => console.warn("模板广告错误", code, message),
});
ads.showNativeTemplateAd({ style: { width: 328 } }, {
  success: () => console.log("展示成功"),
  fail: (code, message) => console.warn("展示失败或请求被取消", code, message),
});

// 业务需要隐藏或释放时分别调用：
// ads.hideNativeTemplateAd();
// ads.destroyNativeTemplateAd();
```

接口使用 OPPO 的 `qg.createCustomAd`，由 `show()` 自动请求加载。`style` 仅支持 `top`、`left`、`width`，单位 dp；高度由模板比例决定，不传样式时采用宿主默认布局。广告区域必须完整位于屏幕内，平台还会限制最小模板尺寸。相同样式复用实例，改变样式则销毁重建；展示请求未完成时再次展示返回正在播放错误，隐藏或销毁会取消该请求。

展示成功回调只代表展示成功，不发放奖励。原生模板最低平台版本为 1094，左图右文竖版最低为 1103，业务应配置相应的 `minPlatformVersion`，并按官方建议将广告请求间隔控制在至少两秒。详见 [OPPO 官方原生模板广告文档](https://ie-activity-cn.heytapimage.com/static/minigame/CN/docs/index.html#/develop/ad/native-template-ad)。框架的 Node 回归不替代真机填充、布局和关闭验证。

## HarmonyOS NEXT 原生广告

完整的依赖安装、Cocos 构建、原生接线、真机运行、更新和排障步骤见[鸿蒙 NEXT 广告使用指南](docs/harmony-ads.md)。

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

## 233 乐园 APK 广告

Android 渠道包通过随包的 Java 桥接接入 233 乐园激励视频、插屏和 Banner 接口，业务使用 `MiniGame.MiniHelper.ad()`。Banner 当前在渠道侧关闭。Creator 生成 Android 工程后，运行安装器完成原生接线，后续 Build 和 Make 可复用配置。

```powershell
node node_modules/cygnat-cc-framework/scripts/install-apk233-ads.mjs --project . --aar "路径/mpg-cm-v1.1.1.aar" --apply
```

AAR 下载、安装检查和真机自测见[233 乐园 APK 原生广告接入](docs/apk233-ads.md)。

233 渠道可以通过同一安装器追加账号登录。业务在隐私授权后调用 `MiniGame.Apk233Account.init()`，再通过 `MiniGame.MiniHelper.common().login()` 获取服务端校验所需的凭证。接线、账号切换和真机验证见[233 乐园 APK 账号接入](docs/apk233-account.md)。

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

## 鸿蒙 NEXT 游戏登录

官方账号登录、主动切换、账号失效通知与角色上报详见 [鸿蒙 NEXT 游戏登录接入指南](docs/harmony-account.md)。安装器支持先接线、后填写公开 ID；Client Secret 只由服务端管理。
