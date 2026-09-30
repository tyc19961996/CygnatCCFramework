# 小游戏跳转其他小程序设计

## 目标与现状

通过 `MiniHelper.common()` 统一发起跳转，并让微信小游戏调用 `wx.navigateToMiniProgram`。现有接口只有支付宝游戏中心的专用跳转，没有业务可传目标应用的公共方法。

## 平台范围

- 微信：使用 `wx.navigateToMiniProgram`，传递 `appId`、`path`、`extraData`、`shortLink` 和微信版本字段。`shortLink` 从基础库 2.18.1 起支持，只提供它时可省略 `appId` 和 `path`。小游戏发布时仍需按宿主要求配置目标名单。
- 支付宝：使用已有声明的 `my.navigateToMiniProgram`；游戏中心专用跳转保持原行为。
- Bilibili：使用 `bl.navigateToMiniProgram` 跳转其他小游戏；要求目标的 `appId` 和 `vAppId`，目标名单最多十个并需写入 `game.json`。
- 抖音：使用 `tt.navigateToMiniProgram`；小游戏端目前仅支持跳转到抖音小游戏站，调用必须发生在用户触摸结束回调中。
- 快手：当前查到的同名接口属于快手小程序文档，小游戏 API 目录未列出，不接入。
- OPPO：未查到可核实的同名小游戏接口，使用基类兜底。

## 公共接口

`IMiniCommon.navigateToMiniProgram(options): Promise<boolean>` 在宿主成功回调时返回 `true`，宿主失败、同步抛错、API 缺失或平台不支持时返回 `false`。该方法在 `IMiniCommon` 中为可选字段，避免破坏旧版自行实现接口的代码；`MiniHelper.common()` 返回的内置适配器保证提供该方法。`options` 必须包含 `appId` 或微信专用 `shortLink`，可选 `path` 和 `extraData`。只传 `shortLink` 时其他平台返回 `false`，不调用宿主 API。其他平台专用字段分别为 `wechatEnvVersion`、`bilibiliVAppId`、`bilibiliEnvVersion`、`bytedanceEnvVersion`，只有对应平台会接收。Bilibili 缺少 `vAppId` 时直接返回 `false` 并记录警告。

调用宿主 API 前不得异步等待，以保留抖音的用户手势。各平台只组装自己支持的字段；不使用对象整体展开。宿主的失败回调和同步异常记录平台错误并返回 `false`。目标应用是否允许被跳转、游戏配置名单与用户确认由宿主控制。

## 兼容性与验证

只新增方法和类型，不改现有公共方法签名。类型从 `MiniGame/index.ts` 导出，根入口保持命名空间形式。测试使用转译后的适配器与最小宿主对象，覆盖字段透传、成功失败、缺失 API、Bilibili 必填项及同步调用；再执行完整类型检查、构建和发布内容检查。编辑器和真机的跳转及后台配置仍需业务项目验证。

## 依据

- [微信小游戏跳转接口](https://developers.weixin.qq.com/minigame/dev/api/navigate/wx.navigateToMiniProgram.html)
- [支付宝跳转接口](https://github.com/AlipayDocs/open-docs/blob/main/mini/api/%E5%BC%80%E6%94%BE%E8%83%BD%E5%8A%9BAPI/%E5%B0%8F%E7%A8%8B%E5%BA%8F%E7%9B%B8%E4%BA%92%E8%B7%B3%E8%BD%AC/my.navigateToMiniProgram.md)
- [Bilibili 小游戏跳转接口](https://miniapp.bilibili.com/small-game-doc/api/open/navigateToMiniProgram/)
- [抖音小游戏站跳转接口](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/mini-game-station/tt-minigame-access)
- [快手小游戏 API 目录](https://open.kuaishou.com/miniGameDocs/gameDev/api/api)
