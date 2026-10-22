# 小游戏系统信息公共接口实施计划

## 目标与文件

按[设计说明](../specs/2026-10-22-minigame-system-info-design.md)公开系统信息，保留各平台原有行为。

- `MiniGame/interface/IMiniCommon.ts`：添加通用返回类型和可选接口方法。
- `MiniGame/Base/BaseCommon.ts`：添加 `null` 兜底，鸿蒙继承。
- 六个平台的 `*Common.ts`：将现有方法从 `private` 改为 `public`。
- `MiniGame/MiniHelper.ts`、`MiniGame/index.ts`：保证工厂方法可直接调用并公开返回类型。
- `tests/minigame-system-info.*`：覆盖缓存、原始对象、兜底及公共类型兼容。
- `AGENTS.md`：追加实际变更与验证结果。

## 实施步骤

1. [x] 新增运行时和类型契约；执行 `node --test tests/minigame-system-info.test.mjs`，6 项旧行为通过、基类缺失方法的 1 项预期失败；执行 `npx tsc -p tsconfig.json --noEmit`，因公共类型、接口缺失及六个平台方法私有而预期失败。
2. [x] 添加可选字段的 `MiniSystemInfo`，接口声明 `getSystemInfo?(): MiniSystemInfo | null`；基类实现 `return null`；六个平台方法改为 `public`。
3. [x] 把 `getSystemInfo` 加入工厂返回类型两处 `Required<Pick<...>>`，并在模块索引导出 `MiniSystemInfo`；重跑步骤 1，7 项运行时测试及全量类型检查通过。
4. [x] 执行 `npm test`、`npm run build`、`npm run pack:check`；检查生成声明及包内文件，执行 `git diff --check`。
5. [x] 回填实际验证结果并更新 `AGENTS.md`，保留工作区改动，等待提交指示。
6. [x] 审查发现五个平台返回类型未声明原有 `null` 分支。对生成声明使用 TypeScript 编译器 API、`strict: true`、`skipLibCheck: true` 检查消费代码，未判空读取字段的 `@ts-expect-error` 出现 5 项预期失败；为五个平台补充 `| null` 后，具体适配器及泛型工厂的空值检查全部通过。重新运行完整测试、构建与发布包检查均通过。
7. [x] 收到用户升级并提交指示，将 `package.json`、`package-lock.json` 版本同步至 `0.3.11`，更新设计说明与长期记忆；重新执行 `npm test`（120 项、全量类型通过）、`npm run build`、临时 npm 缓存下 `npm run pack:check`（652 文件、版本 0.3.11）与 `git diff --check`。提交主题：`新增(MiniGame)：公开系统信息接口并升级到 0.3.11`。

## 完成状态

`npm test` 的 120 项 Node 测试和全量类型检查通过；`npm run build` 通过。首次 `npm run pack:check` 因默认 npm 缓存目录无写权限失败，使用 `$env:npm_config_cache = Join-Path $env:TEMP 'cygnat-system-info-npm-cache'` 后重试通过，共 652 个文件；用户授权后版本已提升至 `0.3.11`，同样的完整验证重新通过。生成声明包含通用返回类型、工厂必选方法和六个平台的公共具体返回类型，原有六份宿主类型复制流程保持有效。严格消费类型检查为 0 项错误，明确覆盖五个平台和微信泛型工厂的 `null` 分支。中文文档结构与相对链接检查、`git diff --check` 通过。未运行 Cocos 编辑器或真机；本次保留原有宿主调用逻辑。提交主题：`新增(MiniGame)：公开系统信息接口并升级到 0.3.11`。
