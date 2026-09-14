# MiniGame 被动分享与微信 imageUrlId 设计

## 目标

在 `IMiniCommon` 中统一暴露小游戏的被动分享内容注册能力；同时让现有主动分享 API 接受微信专属的 `imageUrlId`，并且仅在微信平台及调用方提供该值时透传。

## 范围与平台结论

`ShareAppMessageOptions` 是主动和被动分享共用的数据形状：`title`、`desc`、`imageUrl`、`imageUrlId`、`query`。`onShareAppMessage` 接受一个无参回调，在宿主触发被动分享时返回该对象。

- 微信：调用 `wx.onShareAppMessage`，并在主动 `wx.shareAppMessage` 与被动回调返回值中透传 `imageUrlId`。
- 抖音：调用 `tt.onShareAppMessage`；平台不支持 `imageUrlId`，因此不传该字段。
- Bilibili：调用 `bl.onShareAppMessage`；基础库低于 3.8.0 或 API 缺失时安全忽略注册；不传 `imageUrlId`。
- 支付宝：将统一回调包装为现有 `my.onShareAppMessage` 属性回调；不传 `imageUrlId`。
- 快手：不改动。现行小游戏公开文档和仓库内 `lib.kuaishou.api.d.ts` 只有 `ks.shareAppMessage`，没有可用的被动分享监听 API。

## 接口与数据流

`IMiniCommon` 声明并导出 `ShareAppMessageOptions`，以及：

```ts
onShareAppMessage(callback: () => ShareAppMessageOptions): void;
```

`BaseCommon` 提供空实现，使不支持的平台保持兼容。各实现平台把宿主的被动分享回调映射到上述回调。这样每次用户点击分享入口时，业务都能生成当前的标题、图片和参数，而不是使用注册瞬间的快照。

## 类型与兼容性

更新微信、抖音和 Bilibili 的本地 API 声明，避免依赖 `any`。微信声明 `imageUrlId`；抖音和 Bilibili 声明其被动分享 API 的最小准确签名。运行时对 Bilibili API 判空。支付宝已有相应属性声明，只复用它。

现有 `shareAppMessage` 调用保持源兼容，因为新增字段可选。非微信平台继续只映射自己支持的字段。

## 验证

使用 Node 内置测试通过转译后的 Common 实现模拟宿主全局对象，验证：微信主动和被动分享均在提供 `imageUrlId` 时透传、未提供时不出现该字段；抖音、Bilibili 与支付宝的被动分享回调仅转发支持字段；Bilibili 不支持时不抛出。最后运行完整 `npm test`，其中包含 TypeScript 类型检查。

## 非目标

不添加分享菜单显示/隐藏 API，不增加多订阅者或注销抽象，也不上传、发布或提交代码。
