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
}

export interface IMiniShowRewardAdOptions {
    placement?: MiniRewardAdPlacement;
}

/** 激励视频广告 */
export interface IMiniRewardAds {
    /**
     * 广告初始化。
     *
     * 字符串参数保留旧调用方式；对象参数用于多广告位。
     */
    init(rewardAdUnitId: string, interstitialUnitId?: string): void;
    init(config: IMiniRewardAdInitConfig): void;

    /**
     * 显示默认激励广告
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
