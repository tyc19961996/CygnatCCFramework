# CygnatCCFramework 协作约定

本文件是仓库级协作说明。每次开始新的对话或新的改动前，先阅读本文件，再检查 `git status` 和最近提交。它记录项目的稳定约束、当前架构和需要跨对话保留的长期记忆，避免不同对话各自形成不一致的实现。

## 项目简介

CygnatCCFramework 是面向 Cocos Creator 的 TypeScript 游戏框架，当前包版本为 `0.3.6`。框架把常用能力按命名空间组织起来，提供核心工具、资源加载、事件、UI 窗口、小游戏平台适配、ECS 和网络请求等能力。

运行时由宿主 Cocos Creator 提供 `cc` 与 `cc/env` 模块。仓库中的 `types/` 只提供编译期声明，不能当作 Node.js 运行时实现。发布包的入口是 `dist/header.js`，公开类型入口是 `dist/header.d.ts`。

公共使用方式是从包根入口导入命名空间：

```ts
import { Core, Asset, Event, UI, MiniGame, ECS, Net } from "cygnat-cc-framework";

Core.enableDebugMode(true);
UI.WindowManager.showWindowByName("MainWindow");
```

包刻意不开放 `cygnat-cc-framework/UI` 一类的子路径。新增公共能力时，必须同时考虑模块索引和根入口的导出边界，不能让使用方依赖 `dist` 内部路径。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `header.ts` | 包根入口，只导出七个公共命名空间。 |
| `Core/` | Cocos 适配、平台识别、屏幕与安全区、日志、定时器、数据结构、对象池、绑定、文件工具、音频、地图寻路和通用工具。 |
| `Asset/` | Cocos 资源加载及资源键定义。 |
| `Event/` | 普通事件、事件工厂、事件管理器和全局事件。 |
| `ECS/` | 实体、组件、系统、匹配器、查询和单例能力。 |
| `MiniGame/` | 微信、支付宝、Bilibili、快手、字节跳动及兜底平台的通用能力、广告、支付和类型声明。通过 `MiniHelper` 按平台选择实现。 |
| `Net/` | HTTP 请求、任务、响应类型和网络文件读取；Socket 当前没有从 `Net/index.ts` 公开。 |
| `UI/` | 窗口、窗口组、Header、资源加载、列表组件、滚动组件、Cocos 容器和 UI 装饰器。 |
| `types/` | Cocos 运行时及全局类型声明，只参与编译，不产生运行时代码。 |
| `tests/` | Node 内置测试、TypeScript 类型契约测试，以及不依赖 Cocos 编辑器的源码结构回归测试。 |
| `scripts/` | 构建后复制小游戏类型声明，并修正 ESM 相对导入扩展名。 |
| `docs/superpowers/specs/` | 设计说明，记录问题、方案、范围和验证方式。 |
| `docs/superpowers/plans/` | 可执行计划，记录文件、步骤、命令和验收结果。 |

源码是唯一实现来源。`dist/` 是构建产物，已被 `.gitignore` 忽略；不要直接编辑或提交 `dist/`、`node_modules/` 和 Cocos 生成目录。

## 稳定架构约束

### 公共导出

- 根入口只能通过命名空间公开模块，保持 `import { Core, UI, ... } from "cygnat-cc-framework"` 这一用法稳定。
- 新增公共类、函数或类型时，先在对应模块的 `index.ts` 导出，再由 `header.ts` 维持命名空间出口；内部实现不要绕过索引暴露。
- 改动公共接口时必须检查已有调用的源兼容性，并补充或更新 `tests/` 中的类型契约测试。
- `package.json` 的 `exports` 只允许根入口和 `./package.json`。除非有明确设计和迁移方案，不增加子路径出口。

### Cocos Creator

- 默认按 Cocos Creator 3.x 的 `Node`、`Component`、`UITransform`、`UIOpacity`、`tween` 和装饰器 API 编写，具体宿主版本的差异以仓库类型声明和实际项目为准。
- 需要由编辑器直接挂载的组件使用明确的 `@ccclass("...")` 类名和 `@menu("cygnat/...")` 菜单路径。包内部组件若在业务项目编辑器中注册不稳定，优先在业务项目的 `assets` 目录写一层薄包装组件。
- 不能把 `types/cocos-creator*.d.ts` 当作运行时模拟。涉及 Cocos 生命周期、节点层级或动效的 Node 测试应使用转译后源码、最小 stub 或结构顺序断言；真正的编辑器运行行为仍需在 Cocos 项目中验证。
- 屏幕尺寸变化要同时考虑窗口、窗口组吞噬节点和 Header。UI 层级调整会改变 sibling index，不能缓存跨节点移动仍会使用的旧索引。

### UI 窗口生命周期

- `WindowGroup` 负责窗口栈、窗口的创建与销毁、窗口显示顺序和窗口组级别的触摸吞噬。
- 新实例化的窗口在异步 Header 准备完成前必须保持 inactive；`WindowBase._show()` 要在激活节点前准备缩放、透明度或无动效的初始状态。
- 窗口组吞噬节点位于动画窗口之外，跟随当前窗口组顶部窗口的下方；不能重新放回每个窗口内部，否则缩放动效会连带缩放吞噬区域。
- `WindowManager.adjustOverlayLayers()` 的顺序固定为：先调整半透明遮罩，再调整各窗口组吞噬节点，最后调整 Header 深度。任何新增层级节点都要遵守这个顺序。
- 修改窗口关闭、隐藏、替换或 Header 回调时，要覆盖异步资源加载、动画完成回调和窗口栈为空这几种状态，避免 `_windows`、窗口组名称数组和 Header 缓存失步。

### MiniGame 平台适配

- 统一接口放在 `MiniGame/interface/`，平台实现分别放在对应平台目录；不把某个平台的字段无条件传给其他平台。
- `MiniHelper` 根据 `Core.Platform` 选择实现；不支持某能力的平台使用 `Base/` 下的兜底实现，保持调用方不需要到处判断平台。
- 新增宿主 API 时同步更新 `MiniGame/types/` 的本地声明和 `scripts/copy-package-types.mjs` 的发布流程，并为公共类型补充类型测试。
- 平台 API 可能缺失或版本不同，适配层应沿用现有的可选调用和错误回调风格，不把宿主异常吞成静默成功。

## 开发、构建与验证

在仓库根目录执行以下命令：

```powershell
# 安装依赖；npm install 还会触发 prepare 构建
npm install

# 完整测试：Node 测试通过后执行 TypeScript 全量类型检查
npm test

# 生成 dist、声明文件、source map，并修正 ESM 相对导入扩展名
npm run build

# 查看 npm 包最终会包含哪些文件
npm run pack:check
```

提交前至少运行与改动相关的测试；公共 API、构建脚本或类型声明变化要运行完整的 `npm test`，涉及发布产物时再运行 `npm run build` 和 `npm run pack:check`。最后运行 `git diff --check`，并确认没有把无关改动、生成物或宿主项目文件带入提交。

当前测试使用 Node.js 内置 `node:test`，包脚本的约定是 `node --test && tsc -p tsconfig.json --noEmit`。不要只运行单个测试就声称完整测试通过。

## 编码与修改规范

- 使用现有 TypeScript ESM 风格和附近文件的格式；新注释、错误信息和面向维护者的说明使用中文。
- 先理解现有生命周期和数据结构，再修改。不要为了局部问题顺手重命名公共 API、重排目录或引入新的依赖。
- 业务行为变化要有回归测试或类型契约证明；只涉及文档的改动至少检查 Markdown 渲染结构、链接和命令是否与仓库一致。
- 修改装饰器、公共索引、平台类型或构建脚本时，必须同时检查编译输出和发布包内容。
- 不要直接修改历史提交，也不要用强制推送改写共享分支历史。需要修正历史行为时新增一个中文提交说明原因。
- 不要把单独的设计文档、实施计划或阶段性代码作为独立提交。只有完整需求实现并完成验证后，才向宿主询问是否提交；宿主主动要求提交时立即按中文提交规则执行。未得到提交指示时保留为工作区改动。

## 文档、计划与 Git 语言规则

中文是本项目文档和协作记录的强制语言：

- 新增或修改的 README、设计说明、实施计划、变更记录、代码注释和 PR 描述，正文与标题必须使用中文。代码、命令、类名、接口名和宿主 API 名称按原样保留。
- 设计说明放在 `docs/superpowers/specs/`，应写清目标、现状问题、方案、范围、兼容性和验证方式。
- 多步骤实施计划放在 `docs/superpowers/plans/`，应写清涉及文件、逐步操作、测试命令、预期结果和完成状态。计划完成后要回填实际验证结果，不能只留下空泛的待办。
- 新增文档文件名可保留日期和技术标识以便工具检索，但标题和正文必须中文；如果新文件不依赖既有工具约定，描述部分优先使用中文。
- Git 提交主题必须中文，推荐格式为 `类型(模块)：中文动词开头的结果描述`，例如 `修复(UI)：修正窗口组吞噬层级`、`测试(MiniGame)：补充被动分享契约`、`文档：记录安全区适配约束`。提交正文也必须中文。
- 现有历史提交和旧文档可能保留英文，这是不可逆历史记录的事实；不得为满足语言规则而重写共享历史。今后新增或实际修改的内容必须中文，接触旧英文文档时应在同一任务中逐步中文化相关部分。

## 长期记忆与跨对话维护

每次完成有意义的代码、接口、构建或文档改动，都要在本文件的“当前状态与变更记忆”中追加一条简短记录，至少包含日期、行为变化、主要文件和验证命令。记录只追加不删除，最新记录放在最前面；如果记录过长，再把已经稳定的历史迁移到对应设计说明或计划中，并保留链接。

开始新任务时按下面顺序恢复上下文：

1. 阅读本文件的项目约束和“当前状态与变更记忆”。
2. 查看 `git status --short --branch`、最近十条 `git log` 和相关设计/计划文档。
3. 明确本次改动涉及的公共导出、运行时平台、测试边界和发布产物。
4. 完成代码与测试后更新本文件，再创建中文提交记录。

## 当前状态与变更记忆

基线日期：2026-09-23。当前分支为 `main`，包版本为 `0.3.6`。以下是最近已经落地、后续改动必须保留的行为：

| 日期 | 已落地行为 | 主要位置 | 已有验证 |
| --- | --- | --- | --- |
| 2026-09-24 | OPPO 登录的统一 `LoginResult.code` 优先返回 token，供业务服务器换取 openid 等用户信息；同时保留 `token` 字段。 | `MiniGame/oppo/OppoCommon.ts`、`MiniGame/interface/IMiniCommon.ts`、`tests/oppo-common.test.mjs` | 待本次提交前重新验证 |
| 2026-09-23 | 已实现 OPPO 小游戏最小独立适配器：平台识别、系统基础能力、OPPO token 登录、激励广告和插屏广告；未实现的能力继续走基类兜底。版本提升到 `0.3.6`，准备提交。 | `Core/engine/Platform.ts`、`MiniGame/oppo/`、`MiniGame/MiniHelper.ts`、`MiniGame/types/lib.oppo.api.d.ts`、`package.json`、`package-lock.json` | `npm test`（30 项通过）、`npm run build`、`npm run pack:check` |
| 2026-09-23 | 记录提交边界：设计文档、实施计划和阶段性改动不单独提交，完整需求验证后再询问宿主提交。 | `AGENTS.md` | 规则检查 |
| 2026-09-23 | 建立仓库级协作约定，固定项目边界、验证流程、长期记忆维护方式，以及文档、计划和 Git 提交的中文规则。 | `AGENTS.md` | `git diff --check`、`npm test`、`npm run build`、`npm run pack:check` |
| 2026-09-21 | 新窗口在 Header 异步准备期间保持 inactive；打开缩放、渐变和无动效的初始状态在节点激活前准备，避免首帧闪现。 | `UI/core/WindowGroup.ts`、`UI/window/WindowBase.ts` | `tests/window-show-transition.test.mjs` |
| 2026-09-21 | 吞噬触摸节点从窗口内部移到窗口组；它不再跟随窗口缩放，并放在窗口组顶部窗口下方。 | `UI/core/WindowGroup.ts`、`UI/window/WindowBase.ts` | `tests/window-swallow-layer.test.mjs` |
| 2026-09-21 | 半透明遮罩、窗口组吞噬节点、Header 使用统一且固定的层级调整顺序。 | `UI/core/WindowManager.ts`、`UI/core/HeaderManager.ts` | `tests/window-swallow-layer.test.mjs` |
| 2026-09-18 | 恢复自定义节点前缀绑定行为。 | `Core/bind/AutoBind.ts` | `tests/autobind-cache.test.mjs` 与完整类型检查 |
| 2026-09-17 | 隔离 AutoBind 的绑定缓存，避免父类和子类实例互相污染。 | `Core/bind/AutoBind.ts` | `tests/autobind-cache.test.mjs` |
| 2026-09-14 | 统一小游戏被动分享回调；微信主动和被动分享支持可选 `imageUrlId`，其他平台只透传各自支持的字段。 | `MiniGame/interface/IMiniCommon.ts`、各平台 `*Common.ts` | `tests/minigame-share.test.mjs` |
| 2026-09-09 | 短震动支持 `light`、`medium`、`heavy`；字节跳动短震动和长震动分别调用对应宿主 API。 | `MiniGame/interface/IMiniCommon.ts`、各平台适配器 | `tests/minigame-vibrate-short.typecheck.ts`、`tests/bytedance-vibration.test.mjs` |
| 2026-09-04 | 安全区适配和移动端固定高度逻辑已修正；UI Header 的 Core 导入已修正。 | `Core/engine/SafeArea.ts`、相关 UI 文件 | `tests/safe-area.test.mjs` |

目前需要特别记住的工程事实：

- `npm test` 会把 `tests/*.typecheck.ts` 一并纳入 TypeScript 检查；修改小游戏接口时不要只验证运行时测试。
- `npm run build` 会复制五个平台的小游戏声明到 `dist/MiniGame/types/`，再修正相对 ESM 导入；任何新平台声明都要检查复制脚本。
- Cocos 运行时相关测试多数通过源码结构或转译 stub 验证，Node 测试通过不等于编辑器内所有场景已经运行验证。
- `Net/socket/Socket.ts` 当前未从公共 `Net` 命名空间导出；如要开放它，需要先补接口设计、类型和测试。
- 根入口封装是 2026-07-17 之后的稳定边界，业务代码不要导入内部文件路径。

后续记录模板：

```markdown
### YYYY-MM-DD：中文变更标题

- 行为：说明对使用方或运行时产生的变化。
- 文件：列出主要源码、测试和文档路径。
- 验证：列出实际执行的命令及结果。
- 提交：填写中文提交主题；未提交时写“尚未提交”。
```
