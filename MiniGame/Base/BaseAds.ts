import {
    IMiniAdsListener,
    IMiniRewardAdInitConfig,
    IMiniRewardAds,
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

export class BaseAds<T,B> implements IMiniRewardAds {
    /** 激励广告ID */
    protected _rewardAdUnitId: string = "";
    /** 多激励广告ID */
    protected _rewardAdUnitIds: Partial<Record<MiniRewardAdPlacement, string>> = {};
    /** 激励广告实例 */
    protected _rewardAd: T = null;
    /** 插屏广告ID */
    protected _interstitialAdUnitId: string = "";
    /** 插屏广告实例 */
    protected _interstitialAd: B = null;

    protected _rewardListener:IMiniAdsListener = null;
    protected _interstitialListener:IMiniAdsListener = null;


    /**
     * 广告成功回调
     */
    protected _rewardSuccess: () => void;
    /**
     * 广告失败回调
     */
    protected _rewardFail: (errCode: number, errMsg: string) => void;
    /**
     * 插屏广告成功回调
     */
    protected _interstitialAdSuccess: () => void;
    /**
     * 插屏广告失败回调
     */
    protected _interstitialAdFail: (errCode: number, errMsg: string) => void;

    public init(rewardAdUnitId: string, interstitialUnitId?: string): void;
    public init(config: IMiniRewardAdInitConfig): void;
    public init(rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig, interstitialUnitId?: string): void {
        const config = this.normalizeInitConfig(rewardAdUnitIdOrConfig, interstitialUnitId);
        this._rewardAdUnitIds = config.rewardAdIds || {};
        this._rewardAdUnitId = this._rewardAdUnitIds[MiniRewardAdPlacement.Default] || "";
        this._interstitialAdUnitId = config.interstitialAdId || "";

         if (this._rewardAdUnitId && !this._rewardAd) {
            console.log('创建激励广告');
            this._rewardAd = this.createVideoAd();
        }

        if (this._interstitialAdUnitId && !this._interstitialAd) {
            console.log('创建插屏广告');
            this._interstitialAd = this.createInterstitialAd();
        }
    }

    protected normalizeInitConfig(
        rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig,
        interstitialUnitId?: string
    ): IMiniRewardAdInitConfig {
        if (typeof rewardAdUnitIdOrConfig === "string") {
            return {
                defaultRewardAdId: rewardAdUnitIdOrConfig,
                rewardAdIds: rewardAdUnitIdOrConfig
                    ? { [MiniRewardAdPlacement.Default]: rewardAdUnitIdOrConfig }
                    : {},
                interstitialAdId: interstitialUnitId,
            };
        }

        const rewardAdIds: Partial<Record<MiniRewardAdPlacement, string>> = {
            ...(rewardAdUnitIdOrConfig?.rewardAdIds || {}),
        };

        if (rewardAdUnitIdOrConfig?.defaultRewardAdId && !rewardAdIds[MiniRewardAdPlacement.Default]) {
            rewardAdIds[MiniRewardAdPlacement.Default] = rewardAdUnitIdOrConfig.defaultRewardAdId;
        }

        return {
            defaultRewardAdId: rewardAdIds[MiniRewardAdPlacement.Default],
            rewardAdIds,
            interstitialAdId: rewardAdUnitIdOrConfig?.interstitialAdId || "",
        };
    }

    /**
     * 显示默认激励广告（旧接口兼容入口，子类不要覆写；平台差异统一在 showRewardAd 里实现）
     * @deprecated 新代码请用 showRewardAd
     */
    public showAds(res: MiniAdCallback): void {
        this.showRewardAd({ placement: MiniRewardAdPlacement.Default }, res);
    }

    public showRewardAd(_options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        res.success();
    }

    protected createVideoAd(): T {
        return null
    }

    protected createInterstitialAd(): B {
        return null
    }

    showInterstitialAd(res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void; }): void {
        res?.success?.();
    }

    protected reset(): void {
        this._rewardSuccess = null;
        this._rewardFail = null;
    }


    public setRewardAdsListener(listener: IMiniAdsListener): void {
        this._rewardListener = listener;
    }

    public setInterstitialAdsListener(listener: IMiniAdsListener): void {
        this._interstitialListener = listener;
    }

}
