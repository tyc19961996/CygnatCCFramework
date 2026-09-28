# MiniGame Banner 广告接入设计

## 目标

在不改变 `MiniHelper.ad()` 和已有激励/插屏广告调用方式的前提下，为 MiniGame 广告层增加统一的 Banner 生命周期接口，并在当前支持的微信、支付宝、Bilibili、快手、字节跳动和 OPPO 平台分别接入宿主 API。未初始化、宿主版本不支持或广告展示失败时，统一通过失败回调和监听器报告，不把平台异常伪装成成功。

## 范围

本次包含：

- 扩展 `IMiniRewardAdInitConfig`，增加可选 `bannerAdId`。
- 在 `IMiniRewardAds` 中公开 Banner 的显示、隐藏、销毁和监听接口。
- 增加跨平台安全的样式、刷新间隔、尺寸和错误类型。
- 扩展 `BaseAds`，统一管理 Banner 实例、回调清理和错误归一化。
- 在六个现有平台适配器中实现对应的 `createBannerAd` 宿主调用及 Banner 事件绑定。
- 补充六个平台的最小 Banner 类型声明，并由现有发布脚本复制到 `dist/MiniGame/types/`。
- 增加公共类型契约、源码结构和 Banner 生命周期回归测试。

本次不包含：

- 原生广告、插屏广告或激励广告行为重构。
- 业务层 Banner 展示策略、定时器或场景管理。
- 对各平台私有 Banner 参数的公共暴露；平台私有字段只在对应适配器内部使用。
- 修改 `package.json` 的子路径出口或直接编辑 `dist/`。

## 公共接口

广告初始化配置新增：

```ts
export interface IMiniRewardAdInitConfig {
    // 既有字段保持不变
    bannerAdId?: string;
}
```

Banner 使用统一的显示参数和回调：

```ts
export interface MiniBannerAdStyle {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
}

export interface IMiniShowBannerAdOptions {
    style?: MiniBannerAdStyle;
    /** 自动刷新间隔，单位为秒；平台不支持或低于平台限制时由宿主处理。 */
    adIntervals?: number;
}

export interface MiniBannerAdSize {
    width: number;
    height: number;
}

export interface MiniBannerAdCallback {
    success?: () => void;
    fail?: (errCode: number, errMsg: string) => void;
}

export interface IMiniBannerAdsListener {
    onShow?: () => void;
    onClose?: () => void;
    onResize?: (size: MiniBannerAdSize) => void;
    onError?: (errCode: number, errMsg: string) => void;
}
```

`IMiniBannerAds` 只描述 Banner 生命周期，不包含整个广告模块的 `init`；初始化仍由完整的 `IMiniRewardAds` 负责。`IMiniRewardAds` 继承 Banner 能力，保持业务层只需从包根入口获取一个广告对象：

```ts
showBannerAd(
    options?: IMiniShowBannerAdOptions,
    res?: MiniBannerAdCallback,
): void;
hideBannerAd(): void;
destroyBannerAd(): void;
setBannerAdsListener(listener: IMiniBannerAdsListener): void;
```

为便于调用方理解，`IMiniBannerAdOptions`、`IMiniBannerAds` 等语义等价别名可以由索引层导出，但运行时只维护一个 Banner 实现。已有 `showAds`、`showRewardAd`、`showInterstitialAd` 和两组既有监听器保持源兼容。

## 生命周期与错误语义

1. `init` 只保存 `bannerAdId`，Banner 实例按首次 `showBannerAd` 的参数惰性创建。这样样式和 `adIntervals` 能在创建时一次性传给宿主，也不会在业务不使用 Banner 时请求广告。
2. 首次显示时，适配器用 `adUnitId`、可选 `style` 和可选 `adIntervals` 创建实例，并绑定 `onLoad`、`onError`、`onResize`、`onClose`（宿主提供时）。`show()` 返回 Promise 的平台在 resolve 时触发 `res.success` 与 `listener.onShow`。
3. `onError` 或 `show()` reject 时，统一调用 `res.fail` 和 `listener.onError`，错误码优先读取 `errCode`/`errorCode`/`code`，错误消息优先读取 `errMsg`/`errorMessage`/`msg`，缺失时使用 `MiniErrorCode.AD_NOT_INIT` 的兼容值；同一次展示最多回调一次。
4. `onResize` 只向监听器传递 `{ width, height }` 数字字段。平台没有尺寸事件时不伪造回调。
5. `hideBannerAd` 只隐藏实例并保留实例，重复调用或尚未创建时安全返回；`destroyBannerAd` 释放宿主实例、清空引用和待处理回调，重复调用幂等。
6. 未配置 `bannerAdId`、宿主缺少 `createBannerAd` 或创建返回空值时，不抛出异常，调用失败回调和 `onError`。
7. Base 适配器保留无平台运行时的安全兜底；不支持 Banner 时使用统一失败语义，而不调用成功回调。

## 平台实现边界

各平台只向自己的宿主 API 传递其声明支持的字段：

| 平台 | 创建 API | 统一接入的事件/方法 | 备注 |
| --- | --- | --- | --- |
| 微信 | `wx.createBannerAd` | `show`、`hide`、`destroy`、`onLoad`、`onError`、`onResize`、`onClose` | 传递 `adUnitId`、`style`、`adIntervals` |
| 支付宝 | `my.createBannerAd` | 同上（按宿主实际存在的方法可选绑定） | 错误字段兼容 `error/errorMessage` |
| Bilibili | `bl.createBannerAd` | 同上 | 类型声明使用可选 API，低版本走失败回调 |
| 快手 | `ks.createBannerAd` | 同上 | `adIntervals` 和样式由快手宿主校验 |
| 字节跳动 | `tt.createBannerAd` | 同上 | `show` Promise reject 进入统一失败回调 |
| OPPO | `qg.createBannerAd` | 同上 | 兼容部分版本只有 `onShow`/`onError` 的事件集合 |

平台实现类继续继承 `BaseAds`，只负责具体创建函数和宿主事件字段映射；公共生命周期、幂等清理和错误归一化集中在基类，避免六份实现产生不同的调用语义。

## 类型与发布边界

- 新增类型全部从 `MiniGame/interface/IMiniAds.ts` 导出，经 `MiniGame/index.ts` 暴露；根 `header.ts` 继续通过 `MiniGame` 命名空间提供公共入口。
- 六份现有平台声明文件增加最小 `BannerAd`、创建参数和 `createBannerAd` 声明；不新增平台声明文件，因此 `scripts/copy-package-types.mjs` 的平台文件列表只需验证仍包含全部六份文件。
- 不把平台私有事件参数泄漏到公共类型；公共错误和尺寸结构只保留跨平台字段。

## 验证方案

- `tests/minigame-banner.typecheck.ts`：从 `MiniGame` 根入口导入 Banner 类型，调用 `MiniHelper.ad().init/showBannerAd/hideBannerAd/destroyBannerAd`，验证样式、刷新间隔、回调和监听器签名。
- `tests/minigame-banner.test.mjs`：用源码转译和最小宿主 stub 覆盖六个平台的创建参数、显示/隐藏/销毁、尺寸事件、错误归一化、未初始化和重复销毁行为。
- 运行 `npm test`，确认 Node 测试与全量 TypeScript 检查通过。
- 运行 `npm run build`，确认六份 Banner 声明复制到 `dist/MiniGame/types/` 且 ESM 导入修正通过。
- 运行 `npm run pack:check` 与 `git diff --check`，确认发布清单和变更格式无误。

## 兼容性结论

旧配置只传激励/插屏广告位时行为不变；旧平台代码不需要新增 Banner 调用即可继续工作。业务代码只依赖 `MiniHelper.ad()` 的公共类型，不依赖 `dist` 内部路径。Banner 的平台差异封装在各适配器和声明文件中，后续新增平台可复用基类生命周期而不改变已有接口。
