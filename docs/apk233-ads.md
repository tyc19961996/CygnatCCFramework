# 233 乐园 APK 原生广告接入

适用于 Cocos Creator 3.8.5 的 Android 构建与 233 乐园广告 SDK v1.1.1。完成 Android 桥接接线后，框架会识别 `Core.Platform.isApk233` 和 `Core.PlatformType.Apk233`，`isAndroid` 仍为 true。游戏照常使用 `MiniGame.MiniHelper.ad()`，通用能力沿用 `BaseCommon`。

| 广告 | 233 SDK 方法 | 框架行为 |
| --- | --- | --- |
| 激励视频 | `showVideoAd(int, IVideoIAdCallback)` | 收到奖励且关闭才调用 `success`。提前关闭走 `fail`。 |
| 插屏 | `showInterstitialAd(int, IAdCallback)` | 广告展示并关闭后调用 `success`。需有可用且已关联游戏的插屏广告位。 |
| Banner | `showBannerAd(int, IAdCallback)`、`closeBannerAd()` | 显示时调用 `success`。隐藏和销毁都请求关闭，收到 SDK 的关闭回调后通知业务。233 控制尺寸与位置。 |

Banner 在 233 官方文档中标记为已关闭。当前渠道包省略 `bannerAdId`，只有 233 开通后才填写。广告位申请文档说明后台目前只可创建激励广告。插屏使用已可用并关联到游戏的 POS。平台要求和最新 SDK 以官方页面为准。[广告 SDK](https://doc.233leyuan.com/SDK/advertising_SDK.html) · [广告位申请](https://doc.233leyuan.com/advertise/Advertising_application.html)

## 自动接入 Android 工程

先用 Creator 生成一次 Android 工程，并从[官方 SDK 文档](https://doc.233leyuan.com/SDK/advertising_SDK.html)下载 ZIP，解出 `SDK/mpg-cm-v1.1.1.aar`。在 233 渠道的 Cocos 客户端根目录执行：

```powershell
node node_modules/cygnat-cc-framework/scripts/install-apk233-ads.mjs --project . --aar "路径/mpg-cm-v1.1.1.aar" --apply
```

安装器补齐 AAR、Java 桥接和 Activity 生命周期、Gradle 依赖、Manifest 权限与宿主包可见性，以及 release 混淆保留规则。接线保存在 `native/engine/android/app`，后续在 Creator 点 Build 和 Make 即可复用。升级框架或重新生成该目录后，再执行同一条命令。只要原 AAR 仍在 `app/libs`，复跑可省略 `--aar`。

- 把 `--apply` 换成 `--dry-run` 可预览要改动的文件。
- `node node_modules/cygnat-cc-framework/scripts/install-apk233-ads.mjs --project . --check` 可检查已接线的工程。存在待应用改动时返回非零。
- 安装器支持 Creator 3.8.5 的标准 Android 应用模板，发现冲突会在写入前报告。已有 `<queries>` 会保留。若自测工具使用独立包名，按实际包名追加可见性条目。
- 接线对当前 Android 源码目录生效。需要同时构建普通 APK 时，为 233 渠道保留独立的 Android 源码工作树。

### 自定义 Android 模板的接线参考

1. 用 Creator 生成 Android 工程。在 Android Studio 中确认 app 模块的实际路径。Creator 3.8.5 默认使用 `native/engine/android/app` 作为 Android 应用源码模板。
2. 从官方文档的 SDK 集成一节下载 ZIP，把其中 `SDK/mpg-cm-v1.1.1.aar` 放到该模块的 `libs/`。Creator 3.8.5 默认 app 的 Gradle 脚本已有匹配该目录的 `fileTree`。自定义模板可用 `implementation files('libs/mpg-cm-v1.1.1.aar')`，并确认应用的 Manifest 声明了 `android.permission.INTERNET`。
3. 把框架包中的 `native/android-233/src/com/cygnat/apk233/Cygnat233AdsBridge.java` 复制到该模块的 `src/com/cygnat/apk233/`。使用自定义 Java 源码目录时，放到对应的 `com/cygnat/apk233/`。只有 233 渠道的 Android 构建加入该源码和 AAR。
4. 在 `AppActivity.java` 中导入 `com.cygnat.apk233.Cygnat233AdsBridge`。在现有 `onCreate` 中、`super.onCreate(savedInstanceState)` 前调用 `Cygnat233AdsBridge.attach(this)`。在现有 `onDestroy` 中、`super.onDestroy()` 前调用 `Cygnat233AdsBridge.detach(this)`。保留已有生命周期逻辑。
5. 在应用 Manifest 的 `<manifest>` 下声明 233 宿主包可见性。已有 `<queries>` 时把 `<package>` 合并进去。若使用独立包名的自测工具，按实际包名追加条目。[Android 包可见性](https://developer.android.com/training/package-visibility/declaring)

```xml
<queries>
    <package android:name="com.meta.box" />
</queries>
```

6. 在 release 使用的 `proguard-rules.pro` 加上反射保留规则，然后重新构建 APK。

```proguard
-keep class com.cygnat.apk233.Cygnat233AdsBridge {
    public static int getProtocolVersion();
    public static boolean submit(java.lang.String);
    public static java.lang.String drainEvents();
}
```

## 在游戏中初始化

`Core.CocosEntry` 初始化平台后，使用开发者后台分配的 appKey 和 POS。按 233 的隐私要求，在用户同意后才触发广告。首次展示时桥接会调用原生 SDK 初始化。

```ts
import { Core, MiniGame } from "cygnat-cc-framework";

if (Core.Platform.isApk233) {
    const ads = MiniGame.MiniHelper.ad();
    ads.init({
        appId: "<233 广告 appKey>",
        defaultRewardAdId: "<激励 POS>",
        // 有已关联的插屏广告位时才填写 interstitialAdId。
    });

    // 实际游戏在玩家点击激励入口时调用。
    ads.showRewardAd({ placement: MiniGame.MiniRewardAdPlacement.Default }, {
        success: () => console.log("发放业务奖励"),
        fail: (code, message) => console.warn(code, message),
    });
}
```

POS 用字符串配置，内容为十进制整数。激励也支持在 `rewardAdIds` 配置现有激励位枚举。SDK 的展示失败码经 `fail` 返回，业务应结束等待状态。Banner 的 `style` 和 `adIntervals` 没有对应的 SDK 入参。游戏进程使用同一个 appKey。全屏广告超时后，同类型请求需等待 SDK 报告关闭或失败。如果 SDK 一直未返回终态，重启游戏进程后可再次请求该类型。

## 验收

将签名 APK 安装到 Android 真机，再用 233 最新自测工具按包名拉起。分别检查完整观看、提前关闭、播放失败和插屏生命周期。先核对 appKey、包名和广告位关联，再排查错误码。普通 APK 不装桥接时走原有框架路径。[233 官方自测说明](https://doc.233leyuan.com/advertise/Advertising_FAQ.html)
