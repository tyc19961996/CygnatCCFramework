/**
 * @Author: Cygnat
 * @Date: 2026-6-22
 * @Description: 快手广告
 */

import { Error, Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";

export class KuaiShouAds extends BaseAds<KuaiShouMiniprogram.RewardedVideoAd, KuaiShouMiniprogram.InterstitialAd> {

    /**
     * 显示广告
     */
    public showAds(res: { success: () => void, fail: (code: number, msg: string) => void }): void {
        if (this._rewardAdUnitId === "" || !this._rewardAd) {
            Warn(MiniErrorCode.AD_NOT_INIT.msg);
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }
        if (this._rewardSuccess) {
            Warn(MiniErrorCode.AD_PLAYING.msg);
            res.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }

        Log("显示广告", this._rewardAdUnitId);

        this._rewardSuccess = res.success;
        this._rewardFail = res.fail;

        this._rewardAd.show().then(() => {
            this._rewardListener?.onShow();
        }).catch((error: KuaiShouMiniprogram.AdErrorEvent) => {
            const adError = this.getAdError(error);
            this._rewardFail?.(adError.code, adError.msg);
            this.reset();
        });
    }

    public showInterstitialAd(res?: { success?: () => void; fail?: (code: number, msg: string) => void; }): void {

        if (!this._interstitialAdUnitId || !this._interstitialAd) {
            res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }

        this._interstitialAdSuccess = res?.success;
        this._interstitialAdFail = res?.fail;

        this._interstitialAd.show().then(() => {
            this._interstitialListener?.onShow();
        }).catch((error: KuaiShouMiniprogram.AdErrorEvent) => {
            const adError = this.getAdError(error);
            this._interstitialAdFail?.(adError.code, adError.msg);
            this.clearInterstitialCallbacks();
        })
    }

    protected createVideoAd(): KuaiShouMiniprogram.RewardedVideoAd {
        let videoAd = ks.createRewardedVideoAd({ adUnitId: this._rewardAdUnitId });
        videoAd.onClose((res?: KuaiShouMiniprogram.RewardedVideoAdCloseEvent) => {
            const isEnded = res === undefined || (res.count !== undefined ? res.count > 0 : res.isEnded);
            if (isEnded) {
                /** 广告播放完成 */
                this._rewardSuccess?.();

                this._rewardListener?.onClose();
            } else {
                /** 中途退出，不发放奖励 */
                this._rewardFail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.reset();
        });
        videoAd.onError((res) => {
            Error(JSON.stringify(res));
            console.log("ks video onError", res.code, res.msg);
        });
        return videoAd;
    }

    protected createInterstitialAd(): KuaiShouMiniprogram.InterstitialAd {
        let interstitialAd = ks.createInterstitialAd({ adUnitId: this._interstitialAdUnitId });
        interstitialAd.onError((res) => {
            Error(JSON.stringify(res));
            console.log("ks interstitialAd onError", res.code, res.msg);
        });
        interstitialAd.onClose(() => {
            this._interstitialAdSuccess?.();
            this._interstitialListener?.onClose();
            this.clearInterstitialCallbacks();
        })

        return interstitialAd;
    }

    private getAdError(error?: KuaiShouMiniprogram.AdErrorEvent): { code: number; msg: string } {
        return {
            code: error?.code ?? -1,
            msg: error?.msg ?? "广告展示失败",
        };
    }

    private clearInterstitialCallbacks(): void {
        this._interstitialAdSuccess = null;
        this._interstitialAdFail = null;
    }

}
