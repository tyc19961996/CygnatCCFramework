/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 字节跳动广告
 */

import { Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import {
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

export class BytedanceAds extends BaseAds<BytedanceMiniprogram.RewardedVideoAd, BytedanceMiniprogram.InterstitialAd> {

    /** 展示激励广告；抖音当前只创建默认广告位实例，非 Default 广告位显式失败 */
    public showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        const placement = options?.placement || MiniRewardAdPlacement.Default;
        if (placement !== MiniRewardAdPlacement.Default) {
            Warn("抖音当前只支持默认激励广告位");
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }
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

    protected createVideoAd() {
        let videoAd = tt.createRewardedVideoAd({ adUnitId: this._rewardAdUnitId, multiton: false });
        /** 激励视频错误事件的监听函数 */
        videoAd.onError((res: { errMsg: string; errCode: number }) => {
            console.log("tt video load onError");
        });
        videoAd.onClose((res: { isEnded: boolean, count?: number }) => {
            if (res.count || res.isEnded) {
                /** 广告播放完成 */
                this._rewardSuccess?.();
                console.log("tt video close isEnded");
            } else {
                /** 中途退出，不发放奖励 */
                this._rewardFail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.reset();
        });
        videoAd.onLoad(() => {
            Log("tt ads video onload success");
        })
        return videoAd;
    }

    public showInterstitialAd(res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void; }): void {

        if (!this._interstitialAdUnitId || !this._interstitialAd) {
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

    protected createInterstitialAd() {
        let interstitialAd = tt.createInterstitialAd({ adUnitId: this._interstitialAdUnitId });
        interstitialAd.onLoad(() => {
            Log("tt ads interstitialAd onload success");
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