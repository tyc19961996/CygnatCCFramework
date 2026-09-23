# OPPO 小游戏平台最小独立适配器实施计划

> **给代理执行者：** 按任务顺序执行本计划。每一步使用复选框跟踪；提交主题和提交正文必须使用中文。

**目标：** 在不改变 `MiniHelper.common()`、`MiniHelper.ad()` 调用方式的前提下，新增 OPPO 小游戏平台识别、登录、系统基础能力、激励广告和插屏广告适配。

**架构：** 增加独立的 `OppoCommon` 与 `OppoAds`，分别继承 `BaseCommon` 与 `BaseAds`。只有 OPPO 文档明确存在且能映射到现有接口的能力才覆写；其余能力继续使用基类兜底。`MiniHelper` 根据 `Platform.isOppo` 返回对应实现，业务代码不感知平台类名。

**技术栈：** TypeScript 5、Cocos Creator 3.x `sys.Platform.OPPO_MINI_GAME`、OPPO `qg` API、Node.js 内置测试、TypeScript 转译 stub。

---

## 文件结构

- 新建 `MiniGame/oppo/OppoCommon.ts`：OPPO 系统信息、生命周期、退出、剪贴板、震动和登录适配。
- 新建 `MiniGame/oppo/OppoAds.ts`：OPPO 激励视频与插屏广告适配。
- 新建 `MiniGame/types/lib.oppo.api.d.ts`：`qg` API 的最小编译期声明。
- 新建 `tests/oppo-platform.test.mjs`：平台识别和 `MiniHelper` 分支的源码回归测试。
- 新建 `tests/oppo-common.test.mjs`：OPPO 登录、系统信息和 `onShow` 回调的转译 stub 测试。
- 新建 `tests/oppo-ads.test.mjs`：激励广告完整播放/中途关闭和插屏关闭回调的转译 stub 测试。
- 新建 `tests/minigame-oppo.typecheck.ts`：公共登录结果、广告初始化配置和 `MiniHelper` 调用的类型契约测试。
- 修改 `Core/engine/Platform.ts`：增加 `PlatformType.Oppo`、`Platform.isOppo` 和 `OPPO_MINI_GAME` 分支。
- 修改 `MiniGame/interface/IMiniCommon.ts`：为 `LoginResult` 增加 OPPO 可选字段。
- 修改 `MiniGame/interface/IMiniAds.ts`：为广告初始化配置增加可选 `appId`、`isDebug`，其他平台忽略这两个字段。
- 修改 `MiniGame/MiniHelper.ts`：导入并选择 `OppoCommon` 与 `OppoAds`。
- 修改 `MiniGame/index.ts`：导出 OPPO 适配类和 `LoginResult` 更新后的公共类型。
- 修改 `scripts/copy-package-types.mjs`：将 `lib.oppo.api.d.ts` 复制到发布产物。

### 任务 1：先写失败测试

**文件：**

- 新建 `tests/oppo-platform.test.mjs`
- 新建 `tests/oppo-common.test.mjs`
- 新建 `tests/oppo-ads.test.mjs`
- 新建 `tests/minigame-oppo.typecheck.ts`

- [ ] **步骤 1：写平台识别测试。** 读取 `Core/engine/Platform.ts` 和 `MiniGame/MiniHelper.ts`，断言源码包含 `PlatformType.Oppo`、`isOppo`、`sys.Platform.OPPO_MINI_GAME`、`new OppoCommon()` 和 `new OppoAds()`。当前源码缺少这些标记，测试应失败。

- [ ] **步骤 2：写 OPPO 登录测试。** 按 `tests/bytedance-vibration.test.mjs` 的转译方式加载 `MiniGame/oppo/OppoCommon.ts`，用最小 `BaseCommon` stub 替换运行时导入。设置 `globalThis.qg.login` 回调返回 `{ data: { token: "oppo-token", uid: "uid-1", nickName: "玩家", avatar: "avatar-url", code: "optional-code" } }`，断言 `login()` 返回 `success: true`、`token`、`uid`、`nickName`、`avatar`，且 `code` 使用平台返回的 `code`。

- [ ] **步骤 3：写 OPPO 登录失败测试。** 让 `qg.login` 调用失败回调 `{ errCode: 401, errMsg: "login failed" }`，断言 Promise 不抛异常，并返回 `success: false`、`errCode: 401`、`errMsg: "login failed"`。

- [ ] **步骤 4：写 OPPO 系统与前台回调测试。** 用 `qg.getSystemInfoSync` 返回 `platform: "android"`、`platformVersionCode: 1165`、`platformVersionName: "11.6.5"`、`screenWidth: 1080`、`screenHeight: 1920`，断言 `getPlatform`、`getLibVersion`、`getHostVersion` 和 `getScreenSize` 的结果；触发保存的 `qg.onShow` 回调，断言基类 `_notifyOnShow` 收到原始参数。

- [ ] **步骤 5：写激励广告测试。** 用最小 `BaseAds` stub 加载 `MiniGame/oppo/OppoAds.ts`。stub 的 `qg.createRewardedVideoAd` 返回带 `load`、`show`、`onClose`、`onError` 的对象。断言 `init` 创建广告，`showRewardAd` 按 `load -> show` 顺序调用；触发 `onClose({ isEnded: true })` 时调用成功回调，触发 `onClose({ isEnded: false })` 时返回 `MiniErrorCode.AD_EXIT` 失败回调。

- [ ] **步骤 6：写插屏广告测试。** stub 的 `qg.createInterstitialAd` 返回带 `load`、`show`、`onClose`、`onError` 的对象。断言 `showInterstitialAd` 按 `load -> show` 顺序调用，触发关闭回调时调用业务成功回调和 `setInterstitialAdsListener` 注册的 `onClose`。

- [ ] **步骤 7：写类型契约测试。** 在 `tests/minigame-oppo.typecheck.ts` 中调用 `MiniHelper.common().login()` 并读取 `result.token`、`result.uid`；使用带 `appId`、`isDebug`、`defaultRewardAdId`、`interstitialAdId` 的对象调用 `MiniHelper.ad().init(config)`。当前类型应因缺少字段和 OPPO 分支而失败。

- [ ] **步骤 8：运行红灯测试。** 执行：

  ```powershell
  node --test tests/oppo-platform.test.mjs tests/oppo-common.test.mjs tests/oppo-ads.test.mjs
  npx tsc -p tsconfig.json --noEmit
  ```

  预期：Node 测试因 OPPO 文件和平台分支不存在而失败，TypeScript 检查因 `LoginResult` 和广告配置缺少字段而失败。若测试因脚本错误失败，先修正测试本身再继续。

### 任务 2：增加公共类型和 `qg` 声明

**文件：**

- 修改 `MiniGame/interface/IMiniCommon.ts`
- 修改 `MiniGame/interface/IMiniAds.ts`
- 新建 `MiniGame/types/lib.oppo.api.d.ts`

- [ ] **步骤 1：扩展登录结果类型。** 在 `LoginResult` 中增加可选的 `token?: string`、`uid?: string`、`nickName?: string`、`avatar?: string`，保留 `code` 的原有语义。

- [ ] **步骤 2：扩展广告初始化配置。** 在 `IMiniRewardAdInitConfig` 增加 `appId?: string` 与 `isDebug?: boolean`，并在注释中说明只有需要应用级广告初始化的平台使用，其他平台忽略。

- [ ] **步骤 3：编写最小 OPPO 类型声明。** 声明 `OppoMinigame.SystemInfo`、`LoginResponse`、`AdError`、`RewardedVideoAd`、`InterstitialAd`、`QG` 和全局 `qg`。广告创建参数使用当前 OPPO 文档的 `adUnitId` 字段；广告实例声明 `load(): Promise<void>`、`show(): Promise<void>`、`onClose`、`onError`、`onLoad` 和可选 `destroy`。声明 `qg.login`、`qg.getSystemInfo`、`qg.getSystemInfoSync`、`qg.getLaunchOptionsSync`、`qg.onShow`、`qg.onTouchStart`、`qg.onTouchMove`、`qg.onTouchEnd`、`qg.onTouchCancel`、`qg.exitApplication`、`qg.setClipboardData`、`qg.vibrateShort`、`qg.vibrateLong`、`qg.initAdService`、`qg.createRewardedVideoAd` 和 `qg.createInterstitialAd`；可选声明用于兼容低版本运行环境。

- [ ] **步骤 4：运行类型检查。** 执行 `npx tsc -p tsconfig.json --noEmit`。预期：类型声明自身无错误；OPPO 类尚未实现导致的测试引用错误仍可能存在。

### 任务 3：实现平台识别和 `OppoCommon`

**文件：**

- 修改 `Core/engine/Platform.ts`
- 修改 `MiniGame/MiniHelper.ts`
- 修改 `MiniGame/index.ts`
- 新建 `MiniGame/oppo/OppoCommon.ts`

- [ ] **步骤 1：增加平台枚举和标志。** 在 `PlatformType` 中增加 `Oppo`；在 `Platform` 中增加 `isOppo`；在 `PlatformInitializer.initPlatform` 中优先匹配 `sys.Platform.OPPO_MINI_GAME`，设置 `isOppo = true`、`platform = PlatformType.Oppo`，并保持其他平台分支不变。

- [ ] **步骤 2：实现 `OppoCommon` 构造和缓存。** 构造函数读取可用的 `qg.getLaunchOptionsSync`，缺失时使用空对象；注册可用的 `qg.onShow`，更新 `_hotLaunchOptions` 并调用 `_notifyOnShow`；只注册文档声明存在的触摸回调，触摸数据字段缺失时保持基类行为。

- [ ] **步骤 3：实现系统基础能力。** 使用 `qg.getSystemInfoSync` 缓存系统信息；`getLibVersion` 返回 `platformVersionCode` 字符串，`getHostVersion` 返回 `platformVersionName`，`getPlatform` 返回系统 `platform`，`getScreenSize` 返回 `screenWidth/screenHeight`；缺失字段使用基类兼容值或 `0`。

- [ ] **步骤 4：实现退出、剪贴板和震动。** `exitMiniProgram` 调用 `qg.exitApplication`（存在时）；`setClipboardData` 调用 `qg.setClipboardData` 并把失败信息写入日志；`vibrateShort`、`vibrateLong` 调用对应 API（不存在时安全返回）。

- [ ] **步骤 5：实现登录。** `login` 返回 Promise，调用 `qg.login`；成功时从 `res.data` 读取 `token`、`uid`、`nickName`、`avatar`、`code`，失败时统一读取 `errCode/errMsg` 或 `code/msg`，不抛出平台异常。

- [ ] **步骤 6：接入 `MiniHelper` 和公共导出。** 在 OPPO 分支返回 `new OppoCommon()`；从 `MiniGame/index.ts` 导出 `OppoCommon`、`OppoAds` 和更新后的 `LoginResult`。

- [ ] **步骤 7：运行 OPPO common 测试。** 执行 `node --test tests/oppo-platform.test.mjs tests/oppo-common.test.mjs`。预期：平台、登录、系统信息和前台回调测试全部通过。

### 任务 4：实现 `OppoAds`

**文件：**

- 新建 `MiniGame/oppo/OppoAds.ts`
- 修改 `MiniGame/MiniHelper.ts`

- [ ] **步骤 1：实现初始化。** 重载 `init`，从配置读取 `appId`、`isDebug` 和广告位；当 `qg.initAdService` 与 `appId` 存在且尚未初始化时调用一次；再调用基类初始化创建激励和插屏实例。

- [ ] **步骤 2：实现激励广告创建和展示。** 创建 `qg.createRewardedVideoAd({ adUnitId })`；绑定 `onLoad`、`onError`、`onClose`；`showRewardAd` 只接受 `Default` 广告位，按 `load -> show` 调用；展示成功通知 `onShow`，完整播放触发成功回调，中途关闭触发 `MiniErrorCode.AD_EXIT`，异常统一清理回调引用。

- [ ] **步骤 3：实现插屏广告创建和展示。** 创建 `qg.createInterstitialAd({ adUnitId })`；绑定加载、错误、关闭事件；`showInterstitialAd` 按 `load -> show` 调用，展示成功通知 `onShow`，关闭时调用业务成功回调和监听器 `onClose`，失败时调用统一错误回调。

- [ ] **步骤 4：接入 `MiniHelper.ad()`。** 在 OPPO 分支返回 `new OppoAds()`；其他平台分支保持原顺序和行为。

- [ ] **步骤 5：运行广告测试。** 执行 `node --test tests/oppo-ads.test.mjs`。预期：激励完整播放、中途关闭、插屏展示和关闭回调全部通过。

### 任务 5：接入发布类型并完成验证

**文件：**

- 修改 `scripts/copy-package-types.mjs`
- 修改 `AGENTS.md`

- [ ] **步骤 1：复制 OPPO 类型声明。** 把 `lib.oppo.api.d.ts` 加入 `miniGameTypeFiles`，确保构建后生成 `dist/MiniGame/types/lib.oppo.api.d.ts`。

- [ ] **步骤 2：运行完整测试。** 执行 `npm test`，预期 Node 测试和 TypeScript 检查均通过。

- [ ] **步骤 3：运行构建。** 执行 `npm run build`，预期 TypeScript 构建和 ESM 扩展名修正通过，并确认 `dist/MiniGame/types/lib.oppo.api.d.ts` 存在。

- [ ] **步骤 4：运行打包预览。** 执行 `npm run pack:check`；若系统 npm 缓存目录出现权限错误，使用仓库内临时缓存重试，确认发布清单包含 `dist/MiniGame/oppo/` 和 OPPO 类型声明。

- [ ] **步骤 5：更新长期记忆。** 在 `AGENTS.md` 的“当前状态与变更记忆”顶部追加 OPPO 适配记录，包含日期、主要文件、支持范围和实际验证命令。

- [ ] **步骤 6：提交中文变更。** 执行 `git diff --check`，确认只包含本计划涉及的文件后，使用中文主题提交，例如：

  ```powershell
  git add Core/engine/Platform.ts MiniGame tests scripts/copy-package-types.mjs AGENTS.md
  git commit -m "新增(MiniGame)：接入 OPPO 小游戏最小适配器"
  ```

## 执行结果

- 已完成平台识别、OPPO common、OPPO 广告、公共类型、发布类型复制和回归测试。
- `npm test` 通过：30 项测试全部通过，TypeScript 类型检查通过。
- `npm run build` 通过：生成 `dist/MiniGame/oppo/` 和 `dist/MiniGame/types/lib.oppo.api.d.ts`。
- `npm run pack:check` 通过：发布清单包含 OPPO 适配器和类型声明。
- 提交步骤暂不执行，等待宿主明确要求提交。
