/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 小游戏广告接口
 */

/** 激励广告位。Default 用于兼容旧业务。 */
export enum MiniRewardAdPlacement {
    Default = "default",
    AliBrowseTask = "ali_browse_task",
    AliOrderTask = "ali_order_task",
}

export interface MiniAdCallback {
    success: () => void;
    fail: (errCode: number, errMsg: string) => void;
}

export interface IMiniRewardAdInitConfig {
    defaultRewardAdId?: string;
    rewardAdIds?: Partial<Record<MiniRewardAdPlacement, string>>;
    interstitialAdId?: string;
    /** Banner 广告位 ID。 */
    bannerAdId?: string;
    /** 需要应用级广告初始化的平台使用。 */
    appId?: string;
    /** 应用级广告初始化是否开启调试日志。 */
    isDebug?: boolean;
}

export interface IMiniShowRewardAdOptions {
    placement?: MiniRewardAdPlacement;
}

/** Banner 广告创建时使用的跨平台样式字段。 */
export interface MiniBannerAdStyle {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
}

/** Banner 广告显示参数。 */
export interface IMiniShowBannerAdOptions {
    style?: MiniBannerAdStyle;
    /** 自动刷新间隔，单位为秒。 */
    adIntervals?: number;
}

/** Banner 显示参数的语义别名。 */
export type IMiniBannerAdOptions = IMiniShowBannerAdOptions;

/** Banner 广告真实渲染尺寸。 */
export interface MiniBannerAdSize {
    width: number;
    height: number;
}

/** Banner 显示结果回调。 */
export interface MiniBannerAdCallback {
    success?: () => void;
    fail?: (errCode: number, errMsg: string) => void;
}

/** Banner 生命周期监听器。 */
export interface IMiniBannerAdsListener {
    onShow?: () => void;
    onClose?: () => void;
    onResize?: (size: MiniBannerAdSize) => void;
    onError?: (errCode: number, errMsg: string) => void;
}

/** Banner 广告能力。 */
export interface IMiniBannerAds {
    /** 显示 Banner 广告；实例在首次调用时惰性创建。 */
    showBannerAd(options?: IMiniShowBannerAdOptions, res?: MiniBannerAdCallback): void;

    /** 隐藏 Banner 广告但保留实例。 */
    hideBannerAd(): void;

    /** 销毁 Banner 实例并清理回调。 */
    destroyBannerAd(): void;

    /** 设置 Banner 生命周期监听器。 */
    setBannerAdsListener(listener: IMiniBannerAdsListener): void;
}

/** 激励视频广告及 Banner 广告。 */
export interface IMiniRewardAds extends IMiniBannerAds {
    /**
     * 广告初始化。
     *
     * 字符串参数保留旧调用方式；对象参数用于多广告位。
     */
    init(rewardAdUnitId: string, interstitialUnitId?: string, bannerAdUnitId?: string): void;
    init(config: IMiniRewardAdInitConfig): void;

    /**
     * 显示默认激励广告
     * @deprecated 旧接口，仅由基类实现，等价于 showRewardAd({ placement: Default }, res)；新代码请用 showRewardAd
     */
    showAds(res: MiniAdCallback): void;

    /** 显示指定广告位的激励广告 */
    showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void;

    /** 显示插屏广告 */
    showInterstitialAd(res?: { success?: () => void, fail?: (errCode: number, errMsg: string) => void }): void;

    setRewardAdsListener(listener: IMiniAdsListener): void;

    setInterstitialAdsListener(listener: IMiniAdsListener): void;

}

export interface IMiniAdsListener {
    onShow(): void;
    onClose(): void;
}
