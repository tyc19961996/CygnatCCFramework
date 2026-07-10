import { IMiniAdsListener, IMiniRewardAds } from "../interface/IMiniAds";

export class BaseAds<T,B> implements IMiniRewardAds {
    /** 激励广告ID */
    protected _rewardAdUnitId: string = "";
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

    public init(rewardAdUnitId: string,interstitialUnitId?:string): void {
        this._rewardAdUnitId = rewardAdUnitId;
        this._interstitialAdUnitId = interstitialUnitId;

         if (!this._rewardAd) {
            console.log('创建激励广告');
            this._rewardAd = this.createVideoAd();
        }

        if (this._interstitialAdUnitId && !this._interstitialAd) {
            console.log('创建插屏广告');
            this._interstitialAd = this.createInterstitialAd();
        }
    }

    /**
     * 显示广告
     */
    public showAds(res: { success: () => void, fail: (errCode: number, errMsg: string) => void }): void {
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