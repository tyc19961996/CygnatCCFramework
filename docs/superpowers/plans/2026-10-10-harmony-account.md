# 鸿蒙 NEXT 游戏登录实施计划

**目标：** 从包根 MiniGame 提供官方游戏登录、账号变化通知、主动切换和角色上报，不改变广告协议。

**架构：** 沿用现有源码 HAR、纯 TypeScript Worker 队列与 Cocos 同步反射，新增独立账号消息。原生 UI 执行 Game Service Kit 与 Account Kit，凭据仅在合规验证及账号版本检查通过后交付。客户端不缓存授权码，不自动重试弹窗。

**技术：** TypeScript、ArkTS、Node 内置测试、DevEco 本地 SDK。

本计划在当前已授权会话逐项执行；不提交、不推送、不修改宿主或服务端。

2026-10-10 最终交付阶段，用户明确授权“都上传一下”，覆盖此前不提交、不推送的阶段限制。本框架对话按现有 `main` 分支提交并推送至 `origin`，仅包含完整鸿蒙登录 r4 及指南、安装器和回归，不修改游戏或服务器，不发布 npm、不部署。中文提交主题为“新增(MiniGame)：接入鸿蒙 NEXT 游戏登录并修复初始化时序”；游戏 Git 依赖应在推送确认后锁定实际完整提交 SHA，而非浮动 main。

- [x] 在 `tests/harmony-account.test.mjs` 和类型契约中先验证单飞、取消、超时、迟到响应、账号事件及角色绑定；运行 `node --test tests/harmony-account.test.mjs` 确认缺失能力失败。
- [x] 新增 `MiniGame/harmony/HarmonyAccount.ts`、`HarmonyCommon.ts` 与账号接口，在 `MiniHelper.ts` 选择鸿蒙实现，`MiniGame/index.ts` 导出。
- [x] 新增 HAR 的账号协议、Worker 队列、原生服务及反射端点；原生测试验证 init、监听、unionLogin、authorizationCode/state、verifyLocalPlayer 的顺序与失败安全。
- [x] 扩展现有安装器，通过独立登录 CLI 传入公开 App ID、Client ID；先分析全部写入与冲突再 apply，保留广告、签名及其他 metadata，测试 dry-run、check、幂等、重构建和冲突不写入。
- [x] 更新 `docs/harmony-account.md`、README、发布文件列表和 AGENTS 记忆；文档说明公开 ID、指纹、Game Service bizID、服务器私密凭证及账号存档隔离。
- [x] 运行 `npm test`、`npm run build`、`npm run pack:check`、实际 `npm pack --ignore-scripts`、`git diff --check`；检查实际 tgz 内容，回填结果。

## 验收边界

Node 测试只能证明桥接状态与安装器逻辑。本地 SDK 类型及原生 HAR 编译另行核验；后台配置、服务器部署和真机登录仍需宿主完成，不能作为已通过验收。

## 实际结果（2026-10-10）

### r4：修复回调先于服务注册的初始化丢失

- 真机根因由协调对话采样确认：PID 7211 在 16:32:43.905 记录 `ability-callback code=0` 与 `ability-hook registered=false`，16:32:43.965 才记录 `lifecycle-registered`。页面加载成功并不能保证 ETS 模块已注册执行器；r2 拒绝早到回调且无补执行，后续重试持续 `-98007`。
- 纯 TS 钩子最多登记一个合法页面上下文及 Promise，支持回调先到和注册先到两种顺序；服务注册后补执行一次。销毁与新登记取消旧任务并释放登记的上下文，晚到的初始化结果无法满足新任务。
- 安装器在 loadContent 前捕获生命周期代次，成功回调携带该代次初始化；Ability `onWindowStageDestroy` 与页面清理共用取消入口。销毁后旧 loadContent 回调被拒绝；已有销毁方法保留并只插入受管调用，无方法时才补方法。
- 原生早到请求仅等待初始化边界，销毁或超时唤醒并清理请求所有权，不从首次请求上下文提前启动 SDK。`-98007` 提示改为原生账号服务尚未初始化，华为 401 等配置错误仍提示公开 ID、指纹及服务配置；原有错误码值及公共类型名称保持兼容。
- 两种启动顺序、登记后销毁、在途销毁、旧加载回调、首次请求早到、等待销毁/超时、错误提示分别补行为回归；生命周期新增失败先红后绿。只读复审发现销毁方法空白格式漏认可能生成重复方法，再补回归复现后修复；同名未知签名或重复方法现在拒绝且不部分写入。
- `npm test`：113 项 Node 测试及全量类型检查通过；`npm run build` 与 `npm run pack:check` 通过。独立 DevEco API 24 完整代次/销毁 TS 消费 `assembleHar` 成功，耗时 6.725 秒、退出 0。实际游戏源安装器仅执行只读 dry-run，无冲突。
- 最终交付路径：`node_modules/harmony-account-artifacts/cygnat-cc-framework-0.3.10-harmony-login-r4.tgz`；包内安装器验证与真机复验结果在交付后补记。保留只含阶段/布尔/数字的安全日志用于协调对话复验，未修改游戏、服务器或设备存档，未提交、未推送。
- 实际最终包 652 文件、540330 字节；SHA-1 `26473df752615b2903870aee7c45eb49eecc9034`，SHA-256 `CF33121646B7251411A980A6060FF6C72359F8C248B211ADAF0417C6F780B7E8`。包内安装器夹具 dry-run/apply/check、广告 check、无 ID 不写 metadata、文档围栏/链接检查均通过；包内 CLI 对真实游戏只读 dry-run 通过。最终只读复审确认先前 P2 已消除，新改动未发现重要缺陷；`git diff --check` 通过。本行在打包后回填，包字节及哈希保持不变，真机复验待协调对话完成。
- 协调对话后续回填 r4 消费验证：游戏 44/44 通过，Creator 构建 25.026 秒，账号 apply/check、广告 check、OHPM 通过，真实 HAP 构建成功耗时 19.682 秒，签名哈希保持，保留数据覆盖安装成功。
- 真机 PID 14769 在 16:44:16.753 记录页面回调成功且钩子尚未注册，16:44:16.817 注册后 dispatch 并进入 SDK init。后续日志确认 `initialized=true、ready=true`，unionLogin 已启动官方 UIExtensionAbility；16:45:17 首轮返回 `1002000004`（官方取消），16:45:20.961 重试请求、16:45:21.061 再次启动官方 UI。
- 一度因日志缓冲中缺少 init-complete 和黑屏截图怀疑 SDK 同步求值卡死，后续 ready 状态及官方 UI 启动证据排除该判断；只读核查期间未改实现或包。生命周期丢失初始化的问题已有真机修复证据；官方界面可见性、本人授权成功、授权码服务器交换及业务登录仍由协调对话继续验收，不能把取消码写为登录成功。

### r3-diagnostic：持续未初始化的真机诊断

- 协调对话回传真机首次登录及四分钟后重试均立即返回框架 `-98007`；源码中该错误唯一直接触发点是账号服务 `initialization === null`。公开 ID 已进入当前构建，不能仅凭该错误认定 ID、指纹或后台配置不正确。
- 补充可控顺序的原生回归：首次 Worker 请求早于 `initialize` 时期待等待页面加载成功边界。现有实现立即失败，已观察红回归；其余 104 项 Node 测试通过。`npm test` 此阶段未通过，后续 tsc 单独执行通过，不能作为完整绿灯交付。
- 本阶段仅添加 `[CygnatAccount]` 诊断：页面回调错误码、钩子是否注册、服务初始化/销毁、SDK 初始化进入/完成/失败数字码及请求初始化状态；不输出 context、SDK 返回对象、身份、授权码或令牌。原样 r2 ability-init 托管块可升级，用户修改的块仍拒绝。
- 桥接及安装器专项 13/13、全量类型检查和构建通过；独立 DevEco API 24 TS 消费 `assembleHar` 成功，耗时 43.265 秒、退出 0。实际诊断 tgz 解包的必需文件、公共类型、包内安装器夹具 dry-run/apply/check、广告 check、无占位 ID 和文档检查通过；真实游戏仅只读 dry-run，无冲突。
- 诊断包：`node_modules/harmony-account-artifacts/cygnat-cc-framework-0.3.10-harmony-login-r3-diagnostic.tgz`；SHA-1 `dbfe45c1d845160abae1a3fb63dafbbe707fe8ab`；SHA-256 `A3C4B1E372F538D467848C225E98BC55EF45A29C4D94C57D2E6439BC8D2F41F7`。本节在打包后补记，包字节及哈希保持不变。
- 未改变登录行为，也未在请求处理器直接调用 init 越过页面加载边界；框架对话未修改游戏、服务器或设备存档。由协调对话安装、apply、构建和采样真机阶段日志，再确定永久修复；尚未提交、未推送。

### r2：真实 Creator 入口兼容修正

- 真实游戏 Creator 3.8.5 使用 `abilities.srcEntry:"./ets/entryability/EntryAbility.ts"` 与双引号 loadContent。先补 `.ts`/双引号、错误/重复/越界声明回归观察失败，再按明确 srcEntry 定位允许模板；不再硬编码 `.ets`，不修改未被引用的入口。
- 独立原生消费工程先复现 `.ts` 直接导入 ETS 主入口的 `10605999` 错误，再增加 `HarmonyAccountLifecycle.ts` 纯 TS 初始化钩子，由 UI ETS 服务注册执行器。注册前立即失败不保存上下文，入口 catch 消费失败；注册后才转交上下文，原有连续销毁及待重建所有权回归保持通过。
- DevEco API 24 `account_ts_consumer:assembleHar` 实际通过，耗时 6.928 秒；日志 `node_modules/harmony-account-verification/consumer-build.log`。验证工程仅在本仓库忽略目录，未写游戏工程，未写公开占位 ID。
- `npm test`：104 项 Node 测试与全量类型检查通过；`npm run build`、`npm run pack:check`、实际 tgz 解包与 `.ts` 夹具包内安装器 dry-run/apply/check 全部通过。实际包 652 文件、538403 字节、SHA-1 `588327328c167765fb472016313aa03a3c700200`。
- 框架源安装器与实际解包安装器对真实 AntSimulator 项目仅执行 `--dry-run`，均识别实际 `.ts` 入口并返回待应用改动，无冲突、无写入。实际游戏 HAP 编译与真机验证由宿主协调对话执行。
- 最终 r2 产物：`node_modules/harmony-account-artifacts/cygnat-cc-framework-0.3.10-harmony-login-r2.tgz`。版本仍为 `0.3.10`，尚未提交、未推送、未部署。

### r2：真实游戏消费验收回填

- 结果来源：宿主协调对话于 2026-10-10 回传的游戏侧独立集成验证。本框架对话仅记录结果，未修改游戏或服务器，也未重复执行游戏侧安装和构建。
- 游戏实际安装 r2，SHA 与交付包匹配；账号安装器 `--apply`、`--check` 和广告安装器 `--check` 全部通过。r1 到 r2 的所有 `dist` 文件哈希一致，已有 Creator 构建输出继续有效。
- OHPM 安装成功，真实游戏 `EntryAbility.ts` 通过 HAR/Worker 初始化钩子消费；`assembleHap` 编译及签名返回 `BUILD SUCCESSFUL`，耗时 22.609 秒，退出码 0。根签名 `build-profile` 哈希未变；游戏完整测试 43/43 通过。
- 本次补充仅更新本计划和 `AGENTS.md`，检查中文 Markdown 结构并执行 `git diff --check`；r2 tgz 保持原交付字节与哈希，未重新打包。
- 真实游戏 HAP 消费编译验收已通过；未填写公开 ID、未部署服务器、未安装到手机或执行真实登录，后台配置、服务器交换与真机验收仍待完成。生成的 native 工程继续忽略，未提交。

### r1：初次交付验证记录

- 客户端与原生新增能力先运行缺失文件失败，再实现通过；安装器先观察公开 metadata 未写入失败，再实现通过。生命周期重建、连续销毁、ID 更新历史和旧超时回调均单独补先红后绿回归。
- `npm test`：101 项 Node 测试通过，随后完整 TypeScript 类型检查通过，包含包根公共契约。既有广告回归全部通过。
- `npm run build`：通过，ESM 修正 87 个文件的 327 处相对导入。
- `npm run pack:check -- --cache node_modules/.npm-harmony-account-cache`：通过；实际 `npm pack --ignore-scripts --cache node_modules/.npm-harmony-account-cache --pack-destination node_modules/harmony-account-artifacts --json` 包含 651 个文件、536921 字节，SHA-1 为 `f2f61b9bdf57f9a090a92c86804f98693840984c`。
- 实际 tgz 解包后验证 8 项必需原生/安装器/类型文件，加载包内安装器在独立 fixture 执行 dry-run、apply、check 及广告 check 全部通过；无 ID 时 module.json5 字节保持原样。最终交付文件为仓库 `node_modules/harmony-account-artifacts/cygnat-cc-framework-0.3.10-harmony-login-r1.tgz`。
- 独立无公开 ID 验证工程位于 `node_modules/harmony-account-verification/project`，使用 DevEco SDK API 24、Hvigor 6.24.3 执行 `assembleHar --no-daemon`，最终成功耗时 7.585 秒，日志在同验证目录上级 `har-build.log`。未构建真实游戏 HAP，未修改游戏或服务端。
- 只读审查发现并修复在途页面重建、重复请求、托管块外重复初始化和等待重建再次销毁的问题，均通过回归。原生编译的系统能力适用范围警告仍须以真机能力验收为准。
- 中文文档代码围栏与相对链接检查通过；`git diff --check` 通过（只有既有 Git 换行转换提示）。
- 提交：尚未提交；未推送、未部署。后台公开 ID、指纹、Game Service/bizID、服务器核验与真机登录及广告展示回归仍待实际环境完成。
