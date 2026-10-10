# 鸿蒙 NEXT 原生广告框架侧实施计划

> **执行说明：** 按任务逐项实施并用复选框记录完成状态；本任务由当前会话独立完成，不下派子任务。

**目标：** 为 OPENHARMONY 提供不假成功的统一广告适配，并随框架包交付可复用 ArkTS 源码 HAR 与幂等 Cocos 3.8.5 安装器。

**架构：** TypeScript 侧通过同步反射只提交请求和排空 Worker 队列，`HarmonyAds` 负责请求互斥、生命周期映射和唯一结算；原生 HAR 在 UI 主线程使用 Ads Kit，并通过宿主注入函数把事件发回 Worker 队列。安装器只写自有标记块和稳定扩展目录，使用版本、协议与哈希清单保护用户修改。

**技术栈：** TypeScript、Node.js `node:test`、Cocos Creator 3.8.5、ArkTS、Ads Kit、OHPM/Hvigor。

---

## 执行约束

- [x] 只修改 CygnatCCFrameWork；不写 AntSimulator。
- [x] 保持 `ad.init({ defaultRewardAdId, rewardAdIds, interstitialAdId })`、`showRewardAd(options, callback)` 与监听器接口兼容。
- [x] 版本保持 `0.3.10`；实现阶段不拆分提交，完成后按用户确认创建一次本地提交；不推送。
- [x] 所有行为改动先见到测试按预期失败，再写最小实现。
- [x] 真机验收只记录用户实际确认的展示结果，不扩大到奖励、提前关闭和异常场景。

### 任务 1：锁定协议、平台选择和适配器行为

**文件：**
- 新增： `tests/harmony-ads.test.mjs`
- 新增： `tests/minigame-harmony-ads.typecheck.ts`
- 新增： `MiniGame/harmony/HarmonyAdsProtocol.ts`
- 新增： `MiniGame/harmony/HarmonyAdsTransport.ts`
- 新增： `MiniGame/harmony/HarmonyAds.ts`
- 修改： `Core/engine/Platform.ts`
- 修改： `MiniGame/MiniHelper.ts`
- 修改： `MiniGame/header.ts`
- 修改： `MiniGame/index.ts`

- [x] 添加失败测试，要求 OPENHARMONY 保留 `PlatformType.HarmonyOS` 且 `MiniHelper.ad()` 选择 `HarmonyAds`。
- [x] 添加失败测试，覆盖兼容初始化、accepted 不触发 onShow、opened、rewarded+closed、提前关闭、原生 error、全屏互斥、迟到/重复事件、桥缺失、协议不匹配和缺广告位。
- [x] 添加“轮询先排空事件再判断超时”测试：恢复轮询时队列已有 rewarded+closed，即使 wall-clock 已过期也必须成功。
- [x] 运行 `node --test tests/harmony-ads.test.mjs`，确认因实现缺失而失败。
- [x] 定义协议：
```ts
export const HARMONY_ADS_PROTOCOL_VERSION = 1;
export interface HarmonyAdRequest {
    version: 1;
    requestId: string;
    action: "showReward" | "showInterstitial";
    adId: string;
    placement?: string;
}
export interface HarmonyAdEvent {
    version: number;
    requestId: string;
    type: "accepted" | "opened" | "rewarded" | "closed" | "error";
    code?: string | number;
    message?: string;
}
```
- [x] 实现反射 transport，固定薄端点路径；版本与提交失败转换为不可用，事件队列反射异常或非法内容显式抛给适配器并立即失败结算。
- [x] 实现 `HarmonyAds` 单活动请求状态机；每轮 drain 后再判 accepted/总超时；结算后停止定时器。
- [x] 修正 OPENHARMONY 平台分支，新增 `MiniHelper` 选择与公共导出。
- [x] 运行目标测试和 `tsc -p tsconfig.json --noEmit`，确认通过。

### 任务 2：交付无游戏依赖的源码 HAR

**文件：**
- 新增： `native/harmonyos-next/cygnat-harmony-ads/oh-package.json5`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/build-profile.json5`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/hvigorfile.ts`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/Index.ets`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/Worker.ts`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/src/main/module.json5`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/src/main/ets/AdsProtocol.ts`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/src/main/ets/HarmonyAdsService.ets`
- 新增： `native/harmonyos-next/cygnat-harmony-ads/src/main/ets/HarmonyAdsWorkerQueue.ts`
- 新增： `native/harmonyos-next/glue/CygnatHarmonyAdsBridge.ets`
- 新增： `tests/harmony-ads-native.test.mjs`

- [x] 添加失败的源码结构测试，约束 `default { system: harTasks, plugins: [] }`、AdLoader、广告类型 7/12、showAd、两个公共事件、publisherBundleName、订阅先于展示和清理。
- [x] 测试禁止 HAR import `libcocos.so`、PortProxy、游戏包名、测试广告位或生产签名。
- [x] 实现 version=1 的 ArkTS 协议、UI 主线程服务和 Worker 队列；队列只存 JSON 可序列化事件并有有界容量。
- [x] 服务收到请求先验证协议/ID/互斥并发 accepted；创建并完成公共事件订阅后加载和展示广告。
- [x] 以 loading/showing/opened 阶段过滤无请求 ID 的公共广播；rewarded 只在 opened 后发送，展示超时保留原生所有权直到 close/fail/dispose，所有终态安全清理。
- [x] 薄端点只导出 `getProtocolVersion`、`submit`、`drainEvents`，不放游戏配置。
- [x] 运行 `node --test tests/harmony-ads-native.test.mjs`，确认通过。

### 任务 3：实现幂等接入器

**文件：**
- 新增： `scripts/install-harmony-ads.mjs`
- 新增： `tests/harmony-ads-installer.test.mjs`

- [x] 建立 Cocos 3.8.5 最小宿主 fixture，先写失败测试覆盖 `--check`、`--dry-run`、首次 `--apply`、重复 apply 与 check。
- [x] 添加根模块注册、页面销毁、构建产物、Creator 重排后等价 `arkOptions` 收编、重复或嵌套配置拒绝、未知模板、标记损坏、已安装库用户修改、带空格项目路径和第二个干净 fixture 测试。
- [x] CLI 解析仅接受一个模式，默认 `--check`；项目参数解析为绝对路径但写入宿主的依赖必须是相对 `file:` 路径。
- [x] 计算规范化源码 SHA-256；清单写入 frameworkVersion、protocolVersion、sourceHash 与 installedHash。
- [x] 只在已知锚点插入自有标记块；已存在相同标记更新或保持，冲突和未知模板失败关闭。
- [x] dry-run 不写文件；check 对缺失、过期、哈希不符或接线损坏返回非零。
- [x] 运行 `node --test tests/harmony-ads-installer.test.mjs`，确认全部场景通过。

### 任务 4：打包、中文说明与长期记忆

**文件：**
- 修改： `package.json`
- 修改： `README.md`
- 修改： `AGENTS.md`

- [x] 添加失败测试，要求 npm `files` 包含 `native/harmonyos-next` 与 `scripts/install-harmony-ads.mjs`。
- [x] 更新 files 清单，不增加安装钩子，不修改版本。
- [x] README 记录三种命令、稳定安装目录、端点协议、广告位由游戏配置和模板/真机限制。
- [x] AGENTS.md 最新行记录行为、文件、最终验证结果和中文提交主题。

### 任务 5：完整验证与交付

- [x] 运行 `npm test`，记录测试总数和类型检查结果。
- [x] 运行 `npm run build`。
- [x] 运行 `npm run pack:check`，确认 native 源码和安装脚本进入包。
- [x] 在两个临时干净 fixture 上执行 apply、check、重复 apply，并确认 dry-run 零写入。
- [x] 运行 `git diff --check` 和 `git status --short`，确认没有 dist、tgz、AntSimulator 或无关文件。
- [x] 汇报实际 CLI、反射端点、测试/打包结果，以及真机只确认广告展示、未覆盖奖励与异常路径的验收边界。

## 实际验收结果

- `npm test`：71 项 Node 测试通过，TypeScript 全量检查通过。
- `npm run build`：构建成功，修正 85 个文件中的 319 处 ESM 相对导入。
- `npm run pack:check`：dry-run 成功，发布包包含 627 个文件、源码 HAR、纯 TS Worker 子入口、反射薄端点和安装器。
- DevEco API 24 独立 `assembleHar` 成功；真实宿主 `assembleHap` 成功，最终一次耗时 20.020 秒。
- 两个干净模板和 Creator 重构后的安装器流程已覆盖；真实宿主签名配置保持不变，Hvigor 生成物不会被误判为源码修改。r2 tgz 为 513625 字节，SHA-256 为 `6F12DE0C93AD1EB59308266A52784D78D8AFE923B2BF95B1DFE5299AC2BC1794`，离线安装后的游戏行为与消费回归 6/6 通过。
- Cocos Creator 已重新生成游戏脚本，HAP 内 `Resources/src/chunks/bundle.js` 与 Creator 新产物 SHA-256 一致。
- 用户已在 nova12 Pro 真机确认激励视频和插屏可以正常展示；奖励发放、提前关闭、异常回调和超时恢复尚未逐项验收。
- 包版本保持 `0.3.10`；本任务以单个中文本地提交交付，不推送、不发布。
