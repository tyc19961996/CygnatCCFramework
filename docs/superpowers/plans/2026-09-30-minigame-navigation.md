# 小游戏跳转接口实施计划

## 目标与文件

按[设计说明](../specs/2026-09-30-minigame-navigation-design.md)实现 `MiniHelper.common().navigateToMiniProgram`。

- `MiniGame/interface/IMiniCommon.ts`、`MiniGame/index.ts`、`MiniGame/MiniHelper.ts`：公共参数、可选接口方法、内置适配器保证提供的方法和类型出口。
- `MiniGame/Base/BaseCommon.ts`：不支持平台的 `false` 兜底。
- `MiniGame/wechat/WechatCommon.ts`、`MiniGame/alipay/AlipayCommon.ts`、`MiniGame/bilibili/BilibiliCommon.ts`、`MiniGame/bytedance/BytedanceCommon.ts`：平台适配。
- `MiniGame/types/lib.wx.api.d.ts`、`MiniGame/types/lib.bilibili.api.d.ts`、`MiniGame/types/lib.bytedance.api.d.ts`：宿主声明；支付宝声明已存在。
- `tests/minigame-navigation.test.mjs`、`tests/minigame-navigation.typecheck.ts`：运行时与公共类型契约。
- `AGENTS.md`：完成后追加变更记忆。

## 实施步骤

1. [x] 编写基类与四平台的失败测试。`node --test tests/minigame-navigation.test.mjs` 因方法不存在而失败（5 项）。
2. [x] 编写 `MiniHelper.common()` 的类型契约。`npx tsc -p tsconfig.json --noEmit` 因方法和类型不存在而失败。
3. [x] 增加公共接口、根命名空间类型出口、基类兜底和四平台映射。微信传 `wechatEnvVersion`，Bilibili 要求 `bilibiliVAppId`，抖音仅用于小游戏站；API 缺失或失败返回 `false`。
4. [x] 为新增的三个宿主调用补最小类型声明；审查后补旧实现兼容类型契约及四平台同步异常测试，均先失败再修正。单项测试 6 项通过；完整验证见下方结果。
5. [x] 重新执行 `npm test`（40 项通过且类型检查通过）、`npm run build`（通过）和临时 npm 缓存下的 `npm run pack:check`（通过，600 个文件）；`dist` 包含公共类型和宿主声明，`git diff --check` 通过。
6. [x] 补微信 `shortLink`：短链接单独调用的运行时测试和类型契约先失败，再允许只传 `shortLink`，并拒绝其他平台缺少 `appId` 的调用。`npm test`（42 项通过，类型检查通过）、`npm run build` 和临时 npm 缓存下 `npm run pack:check`（600 个文件）均通过；`git diff --check` 通过。
7. [x] 包版本从 `0.3.7` 提升到 `0.3.8`，同步更新锁文件及仓库长期记忆；重新执行 `npm test`（42 项通过、类型检查通过）、`npm run build` 和临时 npm 缓存下 `npm run pack:check`（600 个文件），再检查差异并创建中文提交。

## 完成状态

审查指出的旧实现类型兼容与宿主同步抛错问题已修正并通过复核。微信 `shortLink` 已支持单独传入，不会向其他平台透传。Node 模拟宿主、类型检查、构建和发布内容检查均通过；真机环境跳转与后台配置仍需业务项目验证。包版本为 `0.3.8`；提交主题：`新增(MiniGame)：接入跨应用跳转并升级到 0.3.8`。
