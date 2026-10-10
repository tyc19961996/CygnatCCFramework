# 鸿蒙 NEXT 广告使用指南

本文说明 Cocos Creator 游戏如何复用 CygnatCCFramework 的 HarmonyOS NEXT 原生广告能力。当前只支持激励视频和插屏广告，不支持 HarmonyOS NEXT Banner。

适用基线：Cocos Creator 3.8.5、HarmonyOS NEXT、框架 `0.3.10` 及其包含鸿蒙广告实现的后续版本。原生安装器按 Cocos Creator 3.8.5 生成模板的已知结构接线；模板版本不同或已有同类手工配置时会拒绝猜测修改。

> 截至本文编写时，鸿蒙广告实现位于本地提交 `2ef5cbb9a95b1b516c9b0c8cd35161eeed858e6c`，尚未推送或发布。较早的远端/仓库包也可能显示为 `0.3.10`，因此不能只凭版本号判断是否包含该能力。请使用当前源码或已明确包含鸿蒙实现的本地 tgz；待相关提交或新版本正式发布后，再改用对应提交、标签或发布包。

## 接入前准备

开始前应具备：

- 能由 Cocos Creator 正常构建 HarmonyOS NEXT 的游戏工程。
- 能使用 DevEco Studio 和本机 OHPM 工具链编译、签名并运行 HAP。
- 游戏自己的华为应用信息和正式广告位。框架的 HAR 不保存游戏包名、签名、证书或广告位。
- 用于调试的真机或官方允许的测试环境。签名文件和密码只保留在本机或安全的 CI 密钥系统中，不写入仓库和本文档。

下文中的“客户端根目录”是包含游戏 `assets`、`package.json` 和 `native` 的 Cocos 项目目录，不是 `native/engine/harmonyos-next` 子目录。

## 一、安装框架依赖

### 使用已有 tgz

如果已经取得包含鸿蒙广告能力的框架包，例如当前项目验证过的 `cygnat-cc-framework-0.3.10-harmony-r2.tgz`，建议把它放到游戏工程的 `packages` 目录，并使用相对 `file:` 依赖：

```json
{
  "dependencies": {
    "cygnat-cc-framework": "file:packages/cygnat-cc-framework-0.3.10-harmony-r2.tgz"
  }
}
```

然后在客户端根目录执行：

```powershell
npm install
```

相对路径便于团队和 CI 在不同机器上复现。不要引用某台开发机的绝对路径。

上述 r2 tgz 早于本指南，不包含 `docs/harmony-ads.md`；它的运行时代码仍可按本文接入。需要查阅指南时使用当前框架仓库中的 `docs/harmony-ads.md`，或重新从包含本指南的框架工作区打包。新生成的 tgz 会随包携带该文件。

### 从框架源码生成 tgz

在 CygnatCCFramework 根目录执行：

```powershell
npm install
npm run build
npm pack --ignore-scripts
```

把生成的 tgz 复制到游戏工程的 `packages` 目录，再按上一节配置相对 `file:` 依赖并执行 `npm install`。使用 GitHub 依赖时，也必须选择已经包含鸿蒙广告源码、安装器和本指南的提交或标签。

不要直接修改 `node_modules/cygnat-cc-framework`：重新安装依赖会覆盖这些改动。需要修改通用能力时，应改框架源码、完成验证后重新打包并更新游戏依赖。

## 二、在游戏脚本中配置广告

所有 API 仍从包根入口的 `MiniGame` 命名空间访问：

```ts
import { MiniGame } from "cygnat-cc-framework";

const ads = MiniGame.MiniHelper.ad();

ads.init({
  defaultRewardAdId: "testx9dtjwj8hp",
  interstitialAdId: "testb4znbuh3n2"
});

ads.setRewardAdsListener({
  onShow: () => console.log("激励广告已打开"),
  onClose: () => console.log("激励广告已关闭")
});

export function showRewardAd(): void {
  ads.showRewardAd(
    { placement: MiniGame.MiniRewardAdPlacement.Default },
    {
      success: () => {
        // 只有收到奖励事件并关闭广告后才发放业务奖励。
        console.log("激励广告完整播放，可以发奖");
      },
      fail: (errCode, errMsg) => {
        console.error("激励广告失败", errCode, errMsg);
      }
    }
  );
}

export function showInterstitialAd(): void {
  ads.showInterstitialAd({
    success: () => console.log("插屏广告已关闭"),
    fail: (errCode, errMsg) => {
      console.error("插屏广告失败", errCode, errMsg);
    }
  });
}
```

示例中的两个 ID 是华为官方测试广告位：

- 激励视频：`testx9dtjwj8hp`，见[华为激励广告接入文档](https://developer.huawei.com/consumer/pt/doc/HMSCore-Guides/publisher-service-js-rewarded-0000001133475864)。
- 插屏广告：`testb4znbuh3n2`，见[华为快游戏广告接入文档](https://developer.huawei.com/consumer/es/doc/quickApp-Guides/quickgame-runtime-ad-kit-0000001159778259)。

测试 ID 只用于开发验证。发布前必须替换为当前游戏在 Ads Kit 后台创建的正式广告位，并重新验证应用包名、签名和广告配置。不要把其他游戏的正式广告位复制过来。

激励广告只有在原生端先确认 `rewarded`、随后收到 `closed` 时才调用 `success`。用户提前关闭会调用 `fail`，错误码为框架的 `AD_EXIT`；业务奖励只能放在 `success` 中。插屏的 `success` 也表示该次广告生命周期已经关闭，并不等同于广告刚开始显示。`onShow` 和 `onClose` 适合做暂停音频、恢复游戏等生命周期处理。

## 三、生成 HarmonyOS NEXT 工程

先在 Cocos Creator 中完成一次 HarmonyOS NEXT 构建，让 Creator 生成或刷新：

```text
<客户端根目录>/native/engine/harmonyos-next
```

这一步也会重新生成游戏 JavaScript 和 `cocos_worker.ts`。只在 DevEco Studio 中重新编译 ArkTS，不会把最新的 Cocos 脚本带进 HAP。

Creator 重新构建时可能重写原生模板，所以每次重新生成 HarmonyOS NEXT 工程后，都应重新执行下一节的安装器。

如果游戏仓库忽略了 `native`，新工作区不能从 `npm install` 直接跳到 DevEco。完整恢复顺序必须是：在 Creator 中重新生成 HarmonyOS NEXT 工程，执行安装器 `--apply` 和 `--check`，执行 `ohpm install`，配置本机签名，最后用 DevEco Studio Build/Run。

## 四、运行原生安装器

在客户端根目录执行推荐流程：

```powershell
node node_modules/cygnat-cc-framework/scripts/install-harmony-ads.mjs --project . --dry-run
node node_modules/cygnat-cc-framework/scripts/install-harmony-ads.mjs --project . --apply
node node_modules/cygnat-cc-framework/scripts/install-harmony-ads.mjs --project . --check
```

三种模式分别表示：

- `--dry-run`：列出将发生的改动，不写文件。
- `--apply`：写入或更新安装器负责的接线和原生源码。
- `--check`：只检查当前状态；缺少接线、版本过期或哈希不一致时返回非零。

如果从框架源码仓库直接运行，命令等价为：

```powershell
node scripts/install-harmony-ads.mjs --project <客户端根目录> --dry-run
node scripts/install-harmony-ads.mjs --project <客户端根目录> --apply
node scripts/install-harmony-ads.mjs --project <客户端根目录> --check
```

安装器会：

1. 把随包的源码 HAR 复制到 `native/extensions/cygnat-harmony-ads`。
2. 在 Harmony 工程根模块列表注册该 HAR。
3. 为 entry 增加相对的 `@cygnat/harmony-ads` `file:` 依赖。
4. 接入 `entry/src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets` 同步反射端点。
5. 在页面层接入广告请求与销毁，在 `cocos_worker.ts` 接入纯 TypeScript Worker 子入口和事件队列。
6. 写入包含框架版本、协议版本和源码哈希的安装清单。

安装器只管理带 `cygnat-harmony-ads` 标记的区块。重复执行是幂等的；发现未知模板、损坏或重复标记、非等价 `arkOptions`、端点冲突，或已安装 HAR 被手工修改时，会失败并保留现场供人工处理，不会把冲突吞成成功。

## 五、安装 OHPM 依赖并用 DevEco 运行

安装器 `--check` 通过后，进入 Creator 生成的 Harmony 工程：

```powershell
cd native/engine/harmonyos-next
ohpm install
```

然后用 DevEco Studio 打开这个 `harmonyos-next` 目录：

1. 选择游戏的 entry 模块和实际运行设备。
2. 在本机配置该游戏自己的签名；不要把证书、私钥或密码提交到框架仓库。
3. 执行 Build 或 Run，让 DevEco 编译 HAP 并安装到设备。
4. 在真机分别触发激励视频和插屏，观察 `onShow`、`onClose`、`success` 和 `fail`。

不同 DevEco/Hvigor 安装方式的命令行入口可能不同，因此本指南不硬编码某台机器上的 Hvigor 绝对路径。CI 应使用自身已验证的 DevEco/Hvigor 命令，但仍须在编译前完成 `ohpm install` 和安装器 `--check`。

## 六、后续更新流程

升级框架或让 Creator 重新生成原生工程后，按下面的顺序操作：

1. 更新游戏的框架依赖并执行 `npm install`。
2. 在 Cocos Creator 中重新构建 HarmonyOS NEXT，确保游戏脚本是最新版本。
3. 在客户端根目录依次执行安装器 `--dry-run`、`--apply`、`--check`。
4. 在 `native/engine/harmonyos-next` 执行 `ohpm install`。
5. 用 DevEco Studio 重新 Build/Run，并完成目标设备验收。

游戏是否提交 Creator 生成的 `native` 目录，应遵守游戏仓库自身约定。无论是否提交生成物，都要把上述步骤写入构建流程；可复用的 HAR 源码和安装器始终由框架包维护，每个游戏只维护自己的广告位、应用信息和签名。

## 七、常见问题

### 安装器报告 `runtimeOnly` 或 `arkOptions` 冲突

Creator 有时会重排 `build-profile.json5` 并移除注释。安装器能重新收编唯一、根级且语义等价的 `arkOptions.runtimeOnly.sources` 配置；如果发现重复 `arkOptions`、路径被改动、混入未知字段或配置被嵌套到其他层级，则会按真实冲突停止。

不要直接删除配置后重试。先对照安装器期望的端点 `./src/main/ets/cygnat/CygnatHarmonyAdsBridge.ets`，合并游戏已有配置，确认只保留一个根级 `arkOptions`，再重新执行 `--dry-run` 和 `--apply`。

### `cocos_worker.ts` 中找不到广告接线

Creator 重新生成 Worker 后，之前的托管区块可能消失。重新运行安装器 `--apply` 和 `--check`，并确认文件中存在：

- `@cygnat/harmony-ads/Worker`
- `configureHarmonyAdsWorker`
- `enqueueHarmonyAdEvent`
- `cygnatAdsRequest` 与 `cygnatAdsEvent` 消息分支

### 回调 `AD_BRIDGE_UNAVAILABLE`

这表示游戏脚本无法使用预期的同步反射端点，或事件队列返回了无效数据。确认：

- 当前运行平台确实是 OPENHARMONY。
- 安装器 `--check` 通过。
- DevEco 编译的是刚刚接线的 `native/engine/harmonyos-next`。
- `CygnatHarmonyAdsBridge.ets` 已进入 entry 的 `runtimeOnly.sources`。

### 回调 `AD_PROTOCOL_MISMATCH`

游戏 JavaScript 和原生 HAR 的协议版本不一致。通常是 Creator 游戏脚本、安装器复制的 HAR 或 HAP 中有一部分仍是旧产物。重新执行“更新流程”的全部五步，不要只在 DevEco 中增量编译 ArkTS。

### 广告超时或出现原生错误

框架会把桥接不可用、协议错误、请求超时和 Ads Kit 原生错误显式传给 `fail`，不会伪装成成功。记录完整 `errCode`、`errMsg` 和 DevEco 日志，检查网络、Ads Kit 配置、广告位状态和设备环境。当前 TypeScript 侧等待原生接受请求和整次广告生命周期都有超时保护；超时后仍可能存在尚未真正关闭的原生全屏广告，框架会隔离迟到事件，避免污染下一次请求。

### 提前关闭激励广告后没有奖励

这是预期行为。提前关闭会走 `fail(AD_EXIT)`，只有 `success` 才能发奖。不要在 `onClose` 中发放奖励，因为 `onClose` 同时覆盖完整播放和提前关闭。

### HAP 仍在运行旧业务代码

先在 Cocos Creator 中重新构建 HarmonyOS NEXT，再运行安装器和 DevEco Build/Run。仅执行 `ohpm install` 或 DevEco 的 ArkTS 编译不会刷新 Cocos 生成的 JavaScript。

### 广告前后出现 Spine 空动画等业务异常

例如 `setAnimation("")` 导致的 Spine 异常属于游戏业务代码问题，不是 Ads Kit 或本框架广告协议的问题。应在游戏侧校验动画名并分别排查，不要为了掩盖业务异常修改框架 HAR。

### 安装器拒绝覆盖 `native/extensions/cygnat-harmony-ads`

安装器通过清单和源码哈希保护用户改动。不要删除清单或强制覆盖来绕过保护；先备份并审查差异，把需要复用的修改迁回 CygnatCCFramework 的 `native/harmonyos-next/cygnat-harmony-ads`，重新打包后再更新游戏。

## 八、验收清单与当前边界

每个游戏至少逐项验证：

- Cocos Creator 的最新脚本已经进入最终 HAP。
- 安装器 `--check` 退出码为 0。
- 激励视频可以打开、完整观看并在关闭后只发奖一次。
- 激励视频提前关闭会失败且不发奖。
- 插屏可以打开并关闭，生命周期回调顺序符合业务预期。
- 无网络、无填充、错误广告位和桥接异常会走 `fail`，不会假成功。
- 重复点击时不会并行打开两种全屏广告。

框架侧已经完成 Node 行为测试、TypeScript 类型检查、npm 构建与打包检查、DevEco API 24 源码 HAR 编译，以及真实宿主 HAP 编译。用户已在 nova12 Pro 上确认激励视频和插屏能正常展示；该真机结果不代表奖励发放、提前关闭、异常回调和超时恢复已经在所有游戏中验收，接入方仍需按上面的清单验证。

更多 Ads Kit 背景资料见[华为 Ads Kit](https://developer.huawei.com/consumer/cn/sdk/ads-kit?ha_source=hms1)。
