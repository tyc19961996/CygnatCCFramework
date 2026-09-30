# 小游戏开放页面管理器设计

## 目标与现状

微信小游戏的 `wx.createPageManager()` 同步创建开放页面管理器，供业务使用渠道提供的 `openlink` 加载和展示微信内置活动或功能。仓库目前没有该能力的公共入口或宿主声明。它与此前的跨应用跳转接口用途不同。

## 平台范围与方案

微信基础库 3.6.7 起提供 `createPageManager`。管理器支持 `load`、`show`、`on`、`off`、`destroy`；`load` 需要 `openlink`，`show` 可在已加载后不带参数调用，也可带参数直接展示。渠道可能定义自己的事件名称、查询参数和返回内容，所以公共类型保留字符串事件名、参数对象和 `unknown` 返回值。监听器参数沿用宿主声明的宽松类型，允许严格 TypeScript 项目传入渠道定义的具体事件载荷回调。

检查支付宝、Bilibili、抖音、快手和 OPPO 小游戏的公开资料及仓库宿主声明后，未找到可核实的等价 `PageManager` 或微信 `openlink` 接口。其他平台由 `BaseCommon` 返回 `null`；不把不同平台的普通页面路由或小程序跳转误认为同一能力。

比较两种方案：其一，在统一接口中直接暴露管理器实例，让业务保留加载、展示、监听、销毁的完整控制；其二，封装成一次性的 `showOpenLink` 方法。选择前者，因为调用方可能需要预加载、复用管理器和监听渠道事件；一次性封装会丢失这些能力。

## 公共接口与兼容性

新增 `MiniHelper.common().createPageManager(): MiniPageManager | null`。`IMiniCommon` 中该方法为可选，兼容旧版自行实现接口的适配器；内置适配器均保证存在。`MiniPageManager`、`MiniPageManagerLoadOptions`、`MiniPageManagerShowOptions` 从 `MiniGame/index.ts` 公开，经包根入口的 `MiniGame` 命名空间使用。

微信实现仅检查宿主 API 是否存在、调用并返回原实例。同步创建异常记录警告并返回 `null`；实例方法的 Promise 结果和拒绝由调用方处理。调用方应按业务要求在用户点击入口时展示，并在不再使用时注销监听、销毁实例。基础库缺失时返回 `null`。

## 验证

先写运行时与类型契约测试，确认缺失方法时失败；再实现微信创建、基类兜底、声明和公共导出。覆盖同步创建、原实例方法、API 缺失、同步异常、旧接口实现的类型兼容及严格模式下的具体事件回调。执行 `npm test`、`npm run build`、`npm run pack:check` 和 `git diff --check`；检查 `dist` 中的声明与实现。真机 `openlink` 内容和渠道权限需在业务项目验证。

## 依据

- [微信小游戏开放页面管理器接口](https://developers.weixin.qq.com/minigame/dev/api/open-api/openlink/wx.createPageManager.html)
- [微信小游戏官方类型定义](https://github.com/wechat-miniprogram/minigame-api-typings/blob/master/types/wx/lib.wx.api.d.ts)
- [快手小游戏 API 目录](https://open.kuaishou.com/miniGameDocs/gameDev/api/api)
