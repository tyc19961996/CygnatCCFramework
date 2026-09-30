# 小游戏开放页面管理器实施计划

## 目标与文件

按[设计说明](../specs/2026-09-30-minigame-page-manager-design.md)增加微信开放页面管理器统一入口。

- `MiniGame/interface/IMiniPageManager.ts`：公开管理器及 `load/show` 参数类型。
- `MiniGame/interface/IMiniCommon.ts`、`MiniGame/MiniHelper.ts`、`MiniGame/index.ts`：公共方法与命名空间导出。
- `MiniGame/Base/BaseCommon.ts`、`MiniGame/wechat/WechatCommon.ts`：不支持平台兜底与微信创建。
- `MiniGame/types/lib.wx.api.d.ts`：微信宿主最小声明；现有复制脚本已包含该文件。
- `tests/minigame-page-manager.test.mjs`、`tests/minigame-page-manager.typecheck.ts`、`tests/minigame-page-manager.strict.typecheck.ts`：运行时、公共类型与严格模式类型契约。
- `AGENTS.md`：完成后追加变更记忆。

## 实施步骤

1. [x] 先写运行时测试：微信 API 返回的实例原样返回，可调用 `load/show/on/off/destroy`；API 缺失或同步抛错返回 `null`；基类返回 `null`。`node --test tests/minigame-page-manager.test.mjs` 因方法缺失失败 3 项。
2. [x] 先写类型契约：`MiniGame.MiniHelper.common().createPageManager()` 可直接调用并对 `null` 分支收窄；`load` 必须有 `openlink`，`show` 可不传参；旧版 `IMiniCommon` 结构化实现仍兼容。`npx tsc -p tsconfig.json --noEmit` 因公共类型与方法缺失失败。
3. [x] 新增公共参数与管理器类型、可选接口方法、内置适配器保证和根命名空间导出；微信宿主声明定义 `createPageManager` 与 `PageManager` 方法。基类返回 `null`，微信返回原实例，异常记录警告。步骤 1、2 的命令复跑通过。
4. [x] 审查发现严格模式下 `unknown[]` 监听器参数阻止业务传入渠道专用事件类型。新增独立严格类型契约，`npx tsc --noEmit --strictFunctionTypes true --skipLibCheck --target ES2019 --moduleResolution node --module ESNext tests/minigame-page-manager.strict.typecheck.ts MiniGame/types/lib.wx.api.d.ts` 先得到 4 项预期错误，再与官方宿主声明一致改为宽松回调；相同命令及单项运行时测试通过。
5. [x] 执行 `npm test`、`npm run build`、临时 npm 缓存下 `npm run pack:check`、`git diff --check`；检查 `dist/MiniGame/` 含公开与宿主声明。实际结果见下方完成状态。
6. [x] 回填本计划并更新 `AGENTS.md`；收到提交指示前按仓库约定保留工作区改动。
7. [x] 收到提交指示后，将版本从 `0.3.8` 提升到 `0.3.9`，同步更新锁文件和长期记忆；重新执行 `npm test`（45 项通过、类型检查通过）、严格事件回调类型检查、`npm run build`、临时 npm 缓存下 `npm run pack:check`（604 个文件），检查差异并创建中文提交。

## 完成状态

微信管理器、基类兜底、宿主声明和公共类型已接入。运行时测试经历先红后绿，严格事件回调类型契约也经历先红后绿。`npm test` 共 45 项通过且全量类型检查通过；严格事件回调类型检查、`npm run build` 均通过；`npm run pack:check` 显示版本 `0.3.9`、共 604 个文件；`git diff --check` 通过。真机 `openlink` 内容与渠道权限仍需业务项目验证。提交主题：`新增(MiniGame)：接入微信开放页面管理器并升级到 0.3.9`。
