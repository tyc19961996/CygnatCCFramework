# 233 乐园 APK 账号接入

框架从 `0.3.14` 起支持 Cocos Creator 3.8.5 Android 渠道包使用 233 乐园 v3.2.24 SDK 登录及接收宿主账号变更。

## 安装 Android 桥接

先用 Creator 生成 Android 工程。从官方 ZIP 解出 `mpg-pay-v3.2.24.aar`，在 Cocos 项目根目录执行以下命令。[233 官方 SDK 文档](https://doc.233leyuan.com/SDK/client_access.html)

```powershell
node node_modules/cygnat-cc-framework/scripts/install-apk233-ads.mjs --project . --login-aar "路径/mpg-pay-v3.2.24.aar" --apply
```

首次同时安装广告时加上 `--aar "路径/mpg-cm-v1.1.1.aar"`。广告已接线的项目可以直接追加登录。需要预览文件改动时把 `--apply` 改为 `--dry-run`。完成安装后执行 `--project . --check` 检查接线。AAR 从 233 官方渠道取得，由游戏项目管理。

安装器在 Android 模块接入登录桥接、Gradle 依赖和混淆规则。登录 SDK 仍引用旧版 Android Support 类，Creator 3.8.5 使用 AndroidX，构建需要 Jetifier。安装器会设置已生成的 `build/android/proj/gradle.properties`。如果 Creator 重建了此文件，编译前再运行 `--apply`。自定义构建目录在其 Gradle 根目录设置 `android.enableJetifier=true`，也可通过 Gradle 参数 `-Pandroid.enableJetifier=true` 开启。使用 Android SDK 34 或更高版本编译。

## 游戏侧接入

在 `Core.CocosEntry` 完成平台初始化且用户已同意游戏的隐私政策后，使用 233 后台配置的登录 `appKey` 和开发者 `cpId`。配置和凭证均避免写入日志。

```typescript
import { Core, MiniGame } from "cygnat-cc-framework";

if (Core.Platform.isApk233) {
    await MiniGame.Apk233Account.init({ appKey, cpId });
    const result = await MiniGame.MiniHelper.common().login();
    if (result.success && result.uid && result.sid) {
        // 把 uid、sid 交给业务服务端校验，校验通过后再建立游戏会话。
        await loginToGameServer({ uid: result.uid, sid: result.sid });
    }
}
```

`init` 失败时会拒绝 Promise。`login` 失败时返回 `success: false`、`errCode` 和 `errMsg`。`LoginResult.code` 在 233 渠道保留为 `sid` 的兼容字段，业务请求使用明确的 `sid` 字段。

收到超时码 `-97105` 后，如继续重试仍返回该码，请结束 Android 游戏进程，再从 233 乐园重新打开。SDK 使用进程内共享的登录回调，在旧请求回调结束前需要保留其归属。Activity 重建后调用 `init` 恢复桥接，旧请求尚未结束时同样返回超时。

在登录控制层使用 `MiniGame.Apk233Account.onAccountChanged(handler)` 订阅，控制层销毁时调用返回的取消函数。事件只包含 `generation` 和 `reason`，业务处理规则如下。

| 原因 | 游戏侧处理 |
| --- | --- |
| `logout` | 使游戏会话及在途登录失效，回到登录页。宿主退出时 233 SDK 自行打开登录界面，用户关闭界面后可点击登录按钮重试。已交付登录凭证的 Activity 销毁时也会发送此通知，Activity 重建后由游戏重新初始化。 |
| `changed` | 使旧会话及在途登录失效，通过 `MiniHelper.common().login()` 取一次新账号凭证，再交给业务服务端校验。 |

如果服务端校验返回时账号代次已经更新，丢弃该结果。接线完成后，在 233 乐园客户端中依次验证首次登录、退出后关闭宿主登录页再手动重试、切换到另一账号，以及旧会话失效。自测工具可测登录，账号切换要在 233 乐园客户端中验证。[233 官方常见问题](https://doc.233leyuan.com/purchase/purchase_FAQ.html)
