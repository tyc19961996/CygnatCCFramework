# 鸿蒙 NEXT 原生广告框架侧设计

日期：2026-10-09

状态：完整方案已在 AntSimulator 任务中由用户确认；本文记录 CygnatCCFrameWork 的实施边界。

## 目标

- 保持 `MiniGame.MiniHelper.ad().init(...)`、`showRewardAd(...)`、`showInterstitialAd(...)` 和现有监听器接口不变。
- 在 OPENHARMONY 上选择专用 `HarmonyAds`，缺桥、缺广告位、协议错误、加载失败、提前关闭和超时均失败，绝不使用 `BaseAds` 的无广告成功兜底。
- 随 npm 包交付无游戏依赖的 ArkTS 源码 HAR、Cocos 3.8.5 薄接线模板和显式安装器。
- 本轮只实现激励视频与插屏，不实现鸿蒙 Banner、OAID、Android/iOS 广告或公开 OHPM 发布。

## TypeScript 适配

消息协议版本固定为 1。请求包含 `version`、`requestId`、`action`、`adId` 和可选 `placement`；事件包含 `version`、`requestId`、`type`、可选 `code` 与 `message`。

`HarmonyAdsTransport` 使用 Cocos 3.8.5 同步反射调用宿主薄端点：

- `entry/src/main/ets/cygnat/CygnatHarmonyAdsBridge`
- `entry/getProtocolVersion`
- `entry/submit`
- `entry/drainEvents`

`submit` 只投递请求并立即返回 boolean，`drainEvents` 返回 JSON string。合法空队列必须是 `[]`；反射异常、非字符串、非法 JSON 或非法事件结构不能伪装成空队列，必须由适配器立即结算为 `AD_BRIDGE_UNAVAILABLE`。不得使用 `isSync=false` 等待广告，也不得依赖游戏侧 `oh.postSyncMessage.then`。

`HarmonyAds` 在奖励与插屏之间维护一个全局活动请求。只有 `opened` 触发 `onShow`；`accepted` 只表示原生处理器收到请求；奖励广告必须先收到 `rewarded`，再在 `closed` 时回调 success。轮询每次先排空队列，再判断超时，避免广告期间游戏线程暂停后队列中已有完成事件却被 wall-clock watchdog 抢先判失败。生命周期监听器异常被隔离，终态先按 `requestId` 原子清理再触发外部回调，同一批旧事件不能污染回调中新建的请求。

## 原生源码 HAR

`native/harmonyos-next/cygnat-harmony-ads` 是唯一维护源，使用 `default { system: harTasks, plugins: [] }`。库只依赖 Ads Kit、Ability Kit 和 Basic Services Kit：

- Ads Kit 使用 `AdLoader.loadAd`，激励类型 7、插屏类型 12，并使用 `showAd`。
- 展示前订阅公共事件，限定 `publisherBundleName: "com.huawei.hms.adsservice"`。
- 激励监听 `PPS_REWARD_STATUS_CHANGED` 的 `reward_ad_status`；插屏监听 `PPS_INTERSTITIAL_STATUS_CHANGED` 的 `interstitial_ad_status`。
- 宿主传入 `UIAbilityContext` 和 `sendToWorker`，库不得依赖 `libcocos.so`、游戏 `PortProxy`、包名、证书或广告位。
- UI 主线程服务与 Worker 队列通过消息传递，不假定跨线程单例共享。
- `Worker.ts`、`AdsProtocol.ts` 与 `HarmonyAdsWorkerQueue.ts` 构成纯 TypeScript 子入口 `@cygnat/harmony-ads/Worker`，避免 Cocos Worker `.ts` 导入 ArkTS `.ets`。
- 公共广播没有可靠请求 ID，因此原生服务按 `loading`、`showing`、`opened` 阶段过滤：未进入 `opened` 前不接受奖励或关闭成功，超时后不再转发迟到的奖励与关闭。
- 175 秒 watchdog 在 `loading` 阶段超时会释放锁；广告已提交或打开后只失败结算并保留真实全屏广告所有权，直到 `onAdClose`、`onAdFail` 或 `dispose` 才解锁，防止旧广播串到新请求。


## 安装器

命令固定为：

```powershell
node scripts/install-harmony-ads.mjs --project <client> --check
node scripts/install-harmony-ads.mjs --project <client> --dry-run
node scripts/install-harmony-ads.mjs --project <client> --apply
```

安装器把源码复制到 `native/extensions/cygnat-harmony-ads`，在 Harmony 工程根 `modules` 数组注册源码 HAR，并为 entry 增加相对 `file:` 依赖、`runtimeOnly.sources` 薄端点、页面请求/销毁分支和 Worker 事件入队分支。所有宿主修改使用独占标记；重复执行幂等，未知模板、既有 `arkOptions`、标记损坏、薄端点冲突或已安装源码被用户修改时失败并保持原文件。清单记录框架版本、协议版本和源码哈希；哈希与复制仅忽略确定的 Hvigor 生成物 `build`、`.hvigor`、`oh_modules` 和根 `BuildProfile.ets`，其他额外文件仍视为用户修改。

## 验证与限制

- Node 行为测试覆盖平台选择、兼容初始化、完整奖励、提前关闭、回调重入、监听器异常、桥断开、迟到/重复事件、协议不匹配和“先排队列后超时”。
- 安装器测试覆盖首次、重复、check、dry-run、根模块、页面销毁、构建产物、未知模板、Creator 重排后的等价 `arkOptions` 收编、重复或嵌套配置拒绝、用户修改、带空格路径和第二个干净模板。
- DevEco API 24 的独立 `assembleHar` 与 AntSimulator 真实宿主 `assembleHap` 均已成功；npm 完整测试、构建和打包结果以实施计划回填为准。
- 发布包必须包含源码 HAR、纯 TS Worker 子入口、反射薄端点和显式安装器；本任务保持版本 `0.3.10`，按用户确认创建本地提交，不公开发布。
- Creator 游戏脚本重建、真实宿主 HAP 编译和 npm tgz 消费均已验证；用户在 nova12 Pro 真机确认激励视频和插屏可以正常展示。该真机结论不能扩大为奖励发放、提前关闭、异常回调或超时恢复均已验收。
