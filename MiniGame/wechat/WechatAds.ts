/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 微信广告
 */

import { Error, Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";

export class WechatAds extends BaseAds<WechatMiniprogram.RewardedVideoAd, WechatMiniprogram.InterstitialAd> {


    /**
     * 显示广告
     */
    public showAds(res: { success: () => void, fail: (errCode: number, errMsg: string) => void }): void {
        if (this._rewardAdUnitId === "") {
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
        }).catch(() => {
            this._rewardAd.load().then(() => {
                this._rewardAd.show().then(() => {
                    this._rewardListener?.onShow();
                }).catch((res) => {
                    this._rewardFail?.(res.errCode, res.errMsg);
                    this.reset();
                });
            }).catch((res) => {
                this._rewardFail?.(res.errCode, res.errMsg);
                this.reset();
            });
        });
    }

    public showInterstitialAd(res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void; }): void {

        if (!this._interstitialAdUnitId|| !this._interstitialAd) {
            res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }

        this._interstitialAdSuccess = res?.success;
        this._interstitialAdFail = res?.fail;

        this._interstitialAd.show().then(() => {
            this._interstitialListener?.onShow();
        }).catch(() => {
            this._interstitialAd.load().then(() => {
                this._interstitialAd.show().then(() => {
                    this._interstitialListener?.onShow();
                }).catch((res) => {
                    this._interstitialAdFail?.(res.errCode, res.errMsg);
                    this._interstitialAdSuccess = null;
                    this._interstitialAdFail = null;
                });
            }).catch((res) => {
                this._interstitialAdFail?.(res.errCode, res.errMsg);
                this._interstitialAdSuccess = null;
                this._interstitialAdFail = null;
            })
        })
    }

    protected createVideoAd(): WechatMiniprogram.RewardedVideoAd {
        let videoAd = wx.createRewardedVideoAd({ adUnitId: this._rewardAdUnitId });
        videoAd.onClose((res: WechatMiniprogram.RewardedVideoAdOnCloseListenerResult) => {
            if ((res && res.isEnded) || res === undefined) {
                /** 广告播放完成 */
                this._rewardSuccess?.();

                this._rewardListener?.onClose();
            } else {
                /** 中途退出，不发放奖励 */
                this._rewardFail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.reset();
        });
        videoAd.onLoad(() => {
            Log("wx ads video onload success");
        });
        videoAd.onError((res) => {
            Error(JSON.stringify(res));
            console.log("wx video load onError");
        });
        return videoAd;
    }

    protected createInterstitialAd(): WechatMiniprogram.InterstitialAd {
        let interstitialAd = wx.createInterstitialAd({ adUnitId: this._interstitialAdUnitId });
        interstitialAd.onLoad(() => {
            Log("wx ads interstitialAd onload success");
        });
        interstitialAd.onError((res) => {
            Error(JSON.stringify(res));
            console.log("interstitialAd load onError");
        });
        interstitialAd.onClose(() => {
            this._interstitialAdSuccess?.();
            this._interstitialListener?.onClose();
        })

        return interstitialAd;
    }


}