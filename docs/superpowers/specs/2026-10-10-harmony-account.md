# 鸿蒙 NEXT 游戏登录设计

## 目标与范围

通过包根 MiniGame 接入官方游戏登录、主动账号切换、账号失效通知与角色上报。范围仅包括本框架 TypeScript、随包原生 HAR、接线安装器、回归测试和接入文档；不修改游戏与服务端，不提交、不推送、不部署。版本保持 `0.3.10`。

## 现状与方案

此前 OPENHARMONY 只提供激励视频与插屏原生能力，基础 `login()` 仍落入基类。新增 `HarmonyCommon` 路由到共享 `HarmonyAccount`，成功保持现有 `LoginResult` 并添加可选 `gamePlayerId`，旧调用保持源兼容。新增公共 `HarmonyPlayerRole` 和 `HarmonyAccountChangedEvent`，均由 `MiniGame/index.ts` 导出。

原生能力仍使用 `@cygnat/harmony-ads` 源码 HAR，新增独立 AccountProtocol、纯 TS Worker 队列、账号 ETS 服务与 `CygnatHarmonyAccountBridge` 反射端点；广告协议版本、消息与状态机保持原样。Worker 不能导入 ETS SDK。UIAbility 页面加载完成后初始化，UI 页面执行异步请求并经 Worker 队列返回 primitive JSON。安装器按 abilities.srcEntry 定位 `.ts`/`.ets` 入口；`.ts` 经纯 TS 初始化钩子转交由 UI ETS 服务注册的执行器，避免直接导入 ETS 的 DevEco 限制。真机证实加载回调可以先于服务注册，因此钩子最多保留一份合法上下文，注册后补执行；销毁、重建和迟到回调以生命周期代次隔离。早到请求只等待初始化边界，销毁或超时解除等待，不直接初始化 SDK。

流程为 `gamePlayer.init` → 监听 `playerChanged` → `unionLogin` → Account Kit 新鲜一次授权码与随机 state 核对 → `verifyLocalPlayer` → 交付凭据。默认不强制官方面板，明确用户切换才强制面板。只支持华为账号选项，不伪造第三方实名认证状态。

授权码不持久化；客户端与原生均单飞，requestId 隔离迟到结果，原生记录近期已处理 ID 阻止重复执行。超时不释放仍在途的官方 SDK 操作，官方操作结束才恢复新请求。账号变化立即清空原生与客户端玩家状态并失效在途凭据，事件只含 generation。UI 销毁后的重建等待旧官方操作结束再初始化，VM 重启可通过新 Worker 重建连接。

## 安装与兼容性

登录 CLI 复用广告安装器，分析全部冲突后才写入。托管块保护初始化、UI 与 Worker 接线，runtimeOnly 只接受两端点的唯一等价集合。module.json5 使用不执行代码的 JSON5 数据解析与位置编辑，拒绝重复属性与 ID，保留其他权限、metadata、签名和广告配置。

允许不提供公开 ID 先接线，不写假 ID；后续同时提供真实 App ID、Client ID 配置 metadata 与网络权限。受管值可更新，用户改动与未托管冲突不能覆盖。Client Secret 仅存在于业务服务器。

## 验证与边界

运行 Node 客户端/原生转译 stub/Worker/安装器回归与公共类型契约，执行完整 npm test、构建及实际 npm pack，并从 tgz 验证新增脚本依赖和原生源码。用独立无公开 ID 的验证工程执行 DevEco API 24 assembleHar。

服务器仍须用授权码换 token、查询玩家 ID 并与客户端 ID 比对，完成业务账号与存档绑定。后台公开 ID、指纹、Game Service/bizID、真实服务器交换和真机实名认证、防沉迷、切换及原广告展示不在 Node/HAR 编译验收范围内；详见 [接入指南](../../harmony-account.md)。
