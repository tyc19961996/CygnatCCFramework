# OPPO 小游戏平台最小独立适配器设计

## 目标

在不改变业务层 `MiniHelper.common()`、`MiniHelper.ad()` 调用方式的前提下，新增 OPPO 小游戏平台适配。只实现 OPPO 文档和现有官方示例中能够明确对应的系统、登录、激励广告和插屏广告能力；没有对应接口的能力继续使用 `BaseCommon` 或 `BaseAds` 的兜底实现。

## 范围

本次包含：

- 在 `Core.Platform` 中识别 OPPO 小游戏运行环境。
- 新增 `OppoCommon`，接入系统信息、启动/前后台回调、退出、剪贴板、震动和 OPPO 登录。
- 新增 `OppoAds`，接入激励视频和插屏广告。
- 为 OPPO 的 `qg` 全局对象增加编译期类型声明。
- 在 `MiniHelper` 和 `MiniGame/index.ts` 中接入 OPPO 实现。
- 补充平台识别、登录和广告行为测试。

本次不包含：

- OPPO 支付、分享、订阅、侧边栏、快捷方式、Feed、游戏中心或场景上报。
- 将 OPPO、VIVO、荣耀、小米抽象成统一快游戏基类。
- 为没有文档依据的接口添加猜测实现。
- 修改业务层现有广告调用方式。

## 架构

平台选择仍由 `PlatformInitializer` 和 `MiniHelper` 负责。业务层继续调用：

```ts
MiniHelper.common().login();
MiniHelper.ad().showRewardAd(options, callbacks);
MiniHelper.ad().showInterstitialAd(callbacks);
```

`MiniHelper` 在 `Platform.isOppo` 为真时返回 `OppoCommon` 和 `OppoAds`，其他平台的选择逻辑保持不变。

`OppoCommon` 继承 `BaseCommon`，只覆写 OPPO 已确认的能力。没有覆写的方法自动使用基类实现，返回空对象、`false` 或“不支持”结果，避免把不存在的 OPPO API 当成可用能力。

`OppoAds` 继承 `BaseAds`，维护一个激励广告实例和一个插屏广告实例。广告展示前按 OPPO API 要求加载资源；激励广告只有在关闭结果表示完整播放时才触发业务奖励回调，中途关闭走失败回调。插屏广告关闭时触发完成回调和监听器。

## 登录数据流

OPPO `qg.login` 返回的核心凭证是 `data.token`。为了保持业务层通过统一 `LoginResult.code` 取服务端登录凭证的习惯，OPPO 适配器让 `code` 优先返回 token，同时保留可选的 `token`、`uid`、`nickName` 和 `avatar` 字段。

客户端只负责调用 `qg.login` 并把结果返回给业务层；业务服务器负责使用 token 调用 OPPO 登录验证接口换取最终用户身份。客户端不保存服务端密钥，也不在适配器中实现服务端鉴权。

## 广告数据流

广告初始化沿用 `IMiniRewardAds.init` 的入口，同时允许 OPPO 需要的应用级初始化参数进入 OPPO 实现。激励广告和插屏广告位分别保存，创建和展示过程均检查广告位是否已初始化。

OPPO 广告错误对象可能使用 `code/msg` 或 `errCode/errMsg` 字段，适配器统一转换为 `MiniAdCallback.fail(errCode, errMsg)`。平台广告位字段以当前 OPPO 文档为准，类型声明和实现保持一致，不同时猜测多个版本的字段。

## 兼容性约束

- 不改变 `IMiniRewardAds.showAds` 旧入口；它继续由基类转发到默认激励广告。
- 不要求调用方判断 OPPO 平台；平台判断留在 `MiniHelper` 内部。
- 不为缺失接口伪造成功结果；缺失能力保持基类既有兜底行为。
- 需要平台版本判断的能力只在适配器内部处理，不能把 OPPO 版本号暴露成其他平台的语义。
- `qg` 类型声明只复制到发布产物，不影响其他平台的全局声明。

## 验证

- 使用源码结构或转译 stub 测试验证 OPPO 平台分支、登录 token 映射、激励广告完成/中途关闭和插屏广告回调。
- 运行 `npm test`，确认 Node 测试和 TypeScript 类型检查均通过。
- 运行 `npm run build`，确认 OPPO 类型声明被复制到 `dist/MiniGame/types/`，且 ESM 导入修正流程通过。
- 运行 `npm run pack:check`，确认发布包包含 OPPO 类型声明和编译后的适配器。
