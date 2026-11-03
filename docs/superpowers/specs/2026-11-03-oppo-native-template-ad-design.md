# OPPO 原生模板广告接入设计

日期：2026-11-03。状态：用户已确认，代码与自动验证已完成，并授权随 `0.3.12` 提交；OPPO 真机验收待进行。

## 目标与现状

OPPO 原有激励视频、插屏和 Banner 适配，本次增加原生模板广告调用能力，沿用包根入口的 `MiniGame` 命名空间和 `MiniHelper.ad()` 平台选择机制。最初按 `0.3.11` 实施，用户随后授权提升到 `0.3.12` 并提交，不发布 npm。

官方依据：[OPPO 原生模板广告文档](https://ie-activity-cn.heytapimage.com/static/minigame/CN/docs/index.html#/develop/ad/native-template-ad)。已读取该页面对应的官方 Markdown 内容。

## 官方接口边界

- 创建方法是 `qg.createCustomAd({ adUnitId, style })`，不是 `createNativeAd` 或 `createNativeTemplateAd`。
- `style` 支持可选的 `top`、`left`、`width`；高度由模板比例决定，不将 Banner 的 `height` 透传。
- 调用 `show()` 请求加载并展示，返回 Promise；不额外调用不存在的 `load()`。
- `hide()` 隐藏，`destroy()` 释放实例。
- 提供 `on/offLoad`、`on/offShow`、`on/offHide`、`on/offError`、`on/offClick`；用户点击关闭按钮也触发 `onHide`。
- 文档正文规定最低平台版本 1094，左图右文竖版为 1103；示例类自行使用了 1175，不将该示例阈值当作所有模板的最低版本。
- 官方建议请求间隔至少两秒；接入说明提示业务控制调用频率，并保证模板展示区域完整位于屏幕内。

## 方案选择

推荐提供框架管理的显示、隐藏、销毁和事件监听接口，与现有 Banner 使用方式一致。备选是仅提供返回宿主实例的工厂，改动较少，但调用方需要自行处理事件解绑、复用和错误生命周期。

## 推荐接口

在 `MiniGame/interface/` 定义独立原生模板广告能力及参数类型，通过 `MiniGame/index.ts` 导出：

```ts
const ads = MiniGame.MiniHelper.ad();
ads.init({ nativeTemplateAdId: "OPPO 模板广告位 ID" });
ads.setNativeTemplateAdsListener({
    onLoad: () => {},
    onShow: () => {},
    onHide: () => {},
    onClick: (event) => {},
    onError: (code, message) => {},
});
ads.showNativeTemplateAd({ style: { left: 0, top: 120, width: 328 } }, {
    success: () => {},
    fail: (code, message) => {},
});
ads.hideNativeTemplateAd();
ads.destroyNativeTemplateAd();
```

`success` 表示展示成功，不表示广告点击、关闭或奖励。点击事件保留宿主的 `code`、`msg` 信息，隐藏事件统一包含主动隐藏和用户关闭。

## 生命周期与异常

`OppoAds` 首次展示时惰性创建实例，相同广告位和样式复用；广告位或样式改变时销毁旧实例再创建。重新初始化时释放旧模板实例。销毁使用原始监听函数解绑，隔离旧实例的迟到事件和 Promise，避免影响新的展示请求。展示中的重复请求返回明确失败，事件和 Promise 同时报告错误时单次展示回调只结束一次。

其他平台通过 `BaseAds` 返回明确不支持的失败；隐藏和销毁可安全重复调用。OPPO 宿主缺失、创建或方法同步抛错、展示 Promise 拒绝都进入错误路径，不静默成功。

## 兼容性与范围

初始化对象新增可选 `nativeTemplateAdId`，保留字符串重载及全部旧广告行为。新增聚合能力采用可选接口成员兼容旧的自定义广告适配器，`MiniHelper.ad()` 的返回类型保证内置实现可直接调用。根入口与 `package.json.exports` 不增加子路径。

本次不扩展其他平台的模板广告，不实现自渲染原生广告、点击上报、竞价或奖励逻辑，不修改 Cocos 节点及宿主工程。

## 文件与验证

涉及 `MiniGame/interface/`、`MiniGame/Base/BaseAds.ts`、`MiniGame/oppo/OppoAds.ts`、`MiniGame/MiniHelper.ts`、`MiniGame/index.ts`、`MiniGame/types/lib.oppo.api.d.ts` 和 `tests/`。已有 `scripts/copy-package-types.mjs` 包含 OPPO 声明，验证其输出即可，无需为新接口增加复制项。

先补运行时与类型回归并确认失败，再实现：覆盖参数、事件、实例复用、重建、销毁解绑、迟到回调、缺失能力、同步异常、Promise 拒绝及非 OPPO 兜底。执行 `npm test`、`npm run build`、`npm run pack:check`、`git diff --check`，检查生成声明及包内 OPPO 宿主类型。补中文使用说明及实施结果，更新 `AGENTS.md`。

Node 测试使用转译源码和最小宿主 stub，不等同于 OPPO 真机广告填充及显示验收；真机需验证不同模板比例、用户关闭、隐藏重显和错误事件。
