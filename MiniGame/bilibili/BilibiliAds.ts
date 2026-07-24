/**
 * @Author: Codex
 * @Date: 2026-07-13
 * @Description: Bilibili 小游戏广告适配
 */

import { Error, Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import {
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

/**
 * Bilibili 激励广告适配。
 *
 * 当前业务只接入默认激励广告位。
 * 如果上层传入非 Default placement，会明确走失败回调。
 */
export class BilibiliAds extends BaseAds<BilibiliMiniprogram.RewardedVideoAd, unknown> {

    /** 展示激励广告；Bilibili 当前只支持默认广告位。 */
    public showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        const placement = options?.placement || MiniRewardAdPlacement.Default;
        if (placement !== MiniRewardAdPlacement.Default) {
            Warn("Bilibili 当前只支持默认激励广告位");
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }
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

        Log("显示 Bilibili 激励广告", this._rewardAdUnitId);

        this._rewardSuccess = res.success;
        this._rewardFail = res.fail;

        // show 失败时先 load 再重试一次，保持与其他平台广告适配行为一致。
        this._rewardAd.show().then(() => {
            this._rewardListener?.onShow();
        }).catch((error: BilibiliMiniprogram.RewardedVideoAdErrorEvent) => {
            this._rewardAd.load().then(() => {
                this._rewardAd.show().then(() => {
                    this._rewardListener?.onShow();
                }).catch((secondError: BilibiliMiniprogram.RewardedVideoAdErrorEvent) => {
                    this.failAd(secondError);
                });
            }).catch(() => {
                this.failAd(error);
            });
        });
    }

    /** 创建默认激励广告实例。 */
    protected createVideoAd(): BilibiliMiniprogram.RewardedVideoAd {
        if (!bl.createRewardedVideoAd) {
            Warn("Bilibili 当前环境不支持 createRewardedVideoAd");
            return null;
        }

        const videoAd = bl.createRewardedVideoAd({ adUnitId: this._rewardAdUnitId });
        videoAd.onLoad(() => {
            Log("Bilibili 激励广告加载成功", this._rewardAdUnitId);
        });
        videoAd.onError((res) => {
            Error(JSON.stringify(res));
            console.log("bilibili video onError", res.errCode, res.errMsg);
        });
        videoAd.onClose((res?: BilibiliMiniprogram.RewardedVideoAdCloseEvent) => {
            // 平台文档以 isEnded 表示是否完整观看；count 是兼容部分类似平台返回的兜底。
            const isEnded = res === undefined || (res.count !== undefined ? res.count > 0 : res.isEnded);
            if (isEnded) {
                this._rewardSuccess?.();
                this._rewardListener?.onClose();
            } else {
                this._rewardFail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.reset();
        });

        return videoAd;
    }

    /** Bilibili 插屏广告本次暂不接入，显式失败。 */
    public showInterstitialAd(res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void }): void {
        res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, "Bilibili 小游戏暂未接入插屏广告");
    }

    /** 统一处理展示失败，并清理当前播放回调。 */
    private failAd(error?: BilibiliMiniprogram.RewardedVideoAdErrorEvent): void {
        this._rewardFail?.(error?.errCode || MiniErrorCode.AD_NOT_INIT.code, error?.errMsg || "Bilibili 激励广告展示失败");
        this.reset();
    }
}
