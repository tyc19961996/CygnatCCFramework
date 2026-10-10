# 鸿蒙 NEXT 游戏登录接入指南

本文适用于 Cocos Creator 3.8.5 生成的 HarmonyOS NEXT 原生工程。框架版本保持 `0.3.10`，登录与现有广告共用源码 HAR，但使用独立消息、队列和反射端点。Worker 只导入 `@cygnat/harmony-ads/Worker` 的纯 TypeScript 入口，不能导入 ETS SDK。

## 准备后台配置

在 AppGallery Connect 创建 HarmonyOS 游戏应用，准备公开 App ID、Client ID，配置当前调试或发布签名证书的 SHA-256 指纹，开通 Game Service，按华为要求配置 bizID 和游戏映射。Client Secret 只能由服务器管理，不能写入 Cocos 脚本、HAR、安装参数、metadata、存档或日志。

参考 [华为游戏账号登录官方指南](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/gameservice-gameplayer-huawei)（核对日期：2026-10-10，页面更新日期：2026-09-08），以及本机 DevEco SDK 的 `@hms.core.gameservice.gameplayer.d.ts` 和 `@hms.core.authentication.d.ts`。本实现使用 HarmonyOS NEXT API，不使用 Android 的 playerSSign/cpSign 方案。

用户可以稍后自行填写公开 ID 与后台配置。未配置时只完成工程接线，不能据此认为真实登录已就绪。App ID 不能使用包名代替。

## 安装框架与原生接线

先在游戏项目安装本框架本地 tgz，再由 Creator 生成 HarmonyOS NEXT 原生工程。参考 [广告接入指南](harmony-ads.md) 完成 OHPM 与 DevEco 的常规工程步骤。安装器从游戏项目根目录解析 `native/engine/harmonyos-next`，不会修改业务 TypeScript。

只复制源码和接线，不写入占位 ID：

```powershell
node node_modules/cygnat-cc-framework/scripts/install-harmony-account.mjs --project . --dry-run
node node_modules/cygnat-cc-framework/scripts/install-harmony-account.mjs --project . --apply
node node_modules/cygnat-cc-framework/scripts/install-harmony-account.mjs --project . --check
```

公开值准备完成后，用实际值替换下面命令中的中文参数：

```powershell
node node_modules/cygnat-cc-framework/scripts/install-harmony-account.mjs --project . --app-id "实际公开AppID" --client-id "实际公开ClientID" --dry-run
node node_modules/cygnat-cc-framework/scripts/install-harmony-account.mjs --project . --app-id "实际公开AppID" --client-id "实际公开ClientID" --apply
node node_modules/cygnat-cc-framework/scripts/install-harmony-account.mjs --project . --app-id "实际公开AppID" --client-id "实际公开ClientID" --check
```

两参数必须一起提供。安装器只修改 entry 的 `module.json5.metadata` 中 `app_id`、`client_id` 及缺失的 `ohos.permission.INTERNET`，保留其他 metadata、权限、签名与广告。既有等值 ID 可以接入；与输入冲突的未托管 ID、重复 metadata、未知 runtimeOnly、用户修改的原生源码或桥接都会拒绝，分析失败时不部分写入。受管 ID 后续可通过两参数更新，用户手工修改后发生冲突则需自行核对。

安装器按照 `module.json5.abilities.srcEntry` 定位唯一的 Creator `EntryAbility.ts` 或 `EntryAbility.ets`，不会修改旁边未被引用的入口。仅接受唯一、位于真实代码中的 `windowStage.loadContent('pages/index', (err, data) => {` 或相同格式的双引号模板。在成功回调后初始化游戏服务，并在 UI 页面接入请求、销毁和 Worker 消息；广告反射端点与账号反射端点共同加入 `runtimeOnly.sources`。Creator 重构建后重新运行相同安装命令；端点源码顺序、引号、缩进和尾逗号重排允许重新收编，额外或重复端点仍拒绝。入口缺失、声明重复、路径越界或未知模板均拒绝，不能强行覆盖。

DevEco 禁止 `.ts` 直接导入 ETS HAR 主入口（错误码 `10605999`）。安装器为 `.ts` 入口生成来自 `@cygnat/harmony-ads/Worker` 的纯 TS 初始化钩子导入，UI 页面的 ETS 账号服务加载时注册执行器。页面加载成功回调与执行器注册的先后顺序都受支持：回调先到时仅保留一份待初始化上下文，执行器注册后补执行；页面或 Ability 销毁会取消等待并释放上下文，生命周期代次会拒绝旧加载回调。`.ets` 入口也使用同一生命周期边界。Worker 本身不调用初始化钩子，也不会因此加载 ETS SDK；请求早到时等待合法初始化边界，不从请求侧抢先初始化。

后续在 HarmonyOS NEXT 原生根目录执行 OHPM 安装，再在 DevEco 构建 HAP。缺公开 ID 不妨碍源码 HAR 编译，但真实 Game Service、Account Kit 调用会因配置缺失而失败。

## 游戏侧接口

```typescript
import { MiniGame } from "cygnat-cc-framework";

const unsubscribe = MiniGame.HarmonyAccount.onAccountChanged(({ generation }) => {
    // 立即阻止旧会话请求和存档写入，清空会话并冻结旧账号缓存。
    // 显示重试或切换入口，不自动重复弹窗。
});

const result = await MiniGame.MiniHelper.common().login();
if (result.success && result.gamePlayerId) {
    // 将 code 和 gamePlayerId 发送到业务服务器；不要打印授权码。
    // 服务端核验和存档绑定完成后，才允许进入游戏。
}

// 只从明确的用户点击操作触发官方账号选择面板。
const switched = await MiniGame.HarmonyAccount.switchAccount();

// 服务器绑定当前账号及角色后上报；所有必填字段均为非空字符串。
await MiniGame.HarmonyAccount.reportRole({
    gamePlayerId: result.gamePlayerId!,
    roleId: "0",
    roleName: "default",
    serverId: "1",
    serverName: "默认区服",
});

// 销毁业务界面时移除业务监听。
unsubscribe();
```

`HarmonyPlayerRole` 必填 `gamePlayerId`、`roleId`、`roleName`，可选 `serverId`、`serverName`。无角色系统时按官方要求使用 `roleId:"0"` 和 `roleName:"default"`。不要在失败登录之后执行示例的角色上报；框架会拒绝未登录、已失效或玩家 ID 不匹配的上报。

`common().login()` 和 `HarmonyAccount.login()` 使用 `showLoginDialog:false`，仍可能由华为在首次登录时显示官方面板。`switchAccount()` 与 `common().login(true)` 使用 `showLoginDialog:true`，必须由用户主动触发。相同登录动作共享在途 Promise，不缓存一次性授权码；切换与其他在途操作互斥，不把切换误合并为普通登录。

成功结果为 `{success:true, code:authorizationCode, gamePlayerId:string}`。框架执行 `gamePlayer.init`、监听 `playerChanged`、`unionLogin`、Account Kit 新鲜授权码与随机 state 核对、`verifyLocalPlayer`；只有全部完成且账号未变化时才成功。取消、失败、配置错误、超时和不完整凭据返回 `{success:false,code:"",errCode,errMsg}`，错误消息不包含 SDK 返回的敏感文本。

## 服务器核验与账号隔离

授权码有效期五分钟且仅能使用一次。业务服务器使用自己的 Client Secret 换取用户级 access token，再向华为查询 gamePlayerId，与客户端提交值严格比较。不能用客户端 gamePlayerId 直接建立可信会话。每次重新获取服务器登录凭据都请求新授权码；网络重试不能重放已消费的授权码。

账号变化事件只含单调递增的 `generation`，不携带旧账号、凭据或存档。游戏应立即失效旧会话、停止旧账号存档写入并清空跨账号缓存；按业务策略展示重新登录入口，待新账号服务端核验及存档加载完成后恢复游戏。普通成功登录结果不是账号变化事件，不能因此触发无限重启。

Cocos 的 `game.restart()` 可能仅重置 director，不能据此保证模块单例被清空。若业务采用原生 `sys.restartVM()`，应在重启前持久化一次切换意图；新 VM 注册事件后消费该意图并主动调用一次 `switchAccount()`。新的 Worker 可重新绑定原生 UI 服务。原生服务不持久化授权码；旧结果的 requestId 不会满足新请求。页面销毁后重新加载，初始化会等待旧官方操作退出，再恢复监听。

超时会返回失败并丢弃迟到凭据，但不会强行释放尚未结束的官方操作。等待官方界面退出或 SDK 返回后才可重试，避免叠加弹窗。框架不会自动重试登录或切换；用户取消后留在可操作的登录状态。

## 错误与验收

| errCode | 含义与处理 |
| --- | --- |
| `1002000016`、`1001502012`、`1002000004` | 用户取消登录、授权或实名认证，保留重试入口。 |
| `1002000002`、`1001502005` | 网络失败，检查网络后由用户重试。 |
| `1002000017`、`1001500001`、`1001502014`、`401` | 核对公开 ID、签名指纹和华为服务配置。 |
| `1002000006` | 合规验证不允许进入游戏，遵循官方返回结果。 |
| `-98001`、`-98002` | 桥接未安装、未就绪或协议/凭据无效。 |
| `-98003`、`-98004` | 官方操作在途或已超时，先等待官方界面退出。 |
| `-98005`、`-98006` | 账号已失效或角色不属于当前已验证玩家。 |
| `-98007` | 原生账号服务尚未初始化，请重新启动游戏；此码不能单独证明公开 ID 或指纹配置错误。 |
| `-98008` | 授权响应 state 核对失败。 |

Node 回归覆盖客户端、原生转译 stub、取消/失败、账号变化、超时/迟到、请求去重、页面重建、角色绑定与安装器保护；真实原生 HAR 用 DevEco API 24 编译验证。它们不证明真实登录、服务器交换、实名认证、防沉迷或设备切换已完成验收。

最终仍需在实际公开 ID、指纹、Game Service/bizID 配置及服务器部署完成后，真机验收首次登录、取消、重复点击、切换账号、网络异常、实名认证失败、未成年限制和 VM 重启后的存档隔离；同时回归原有激励视频和插屏。不要将 HAR 编译通过写成真机登录已成功。
