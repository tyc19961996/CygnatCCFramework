/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 支付宝广告
 */

import { Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import {
    IMiniRewardAdInitConfig,
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

type AliRewardAdContext = {
    placement: MiniRewardAdPlacement;
    adUnitId: string;
    ad: AliyMiniprogram.RewardedAd;
    success: (() => void) | null;
    fail: ((errCode: number, errMsg: string) => void) | null;
};

export class AlipayAds extends BaseAds<AliyMiniprogram.RewardedAd, any> {

    private _rewardAdContexts: Map<MiniRewardAdPlacement, AliRewardAdContext> = new Map();
    private _showingPlacement: MiniRewardAdPlacement | null = null;

    public init(rewardAdUnitId: string, interstitialUnitId?: string): void;
    public init(config: IMiniRewardAdInitConfig): void;
    public init(rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig, interstitialUnitId?: string): void {
        const config = this.normalizeInitConfig(rewardAdUnitIdOrConfig, interstitialUnitId);
        this._rewardAdUnitIds = config.rewardAdIds || {};
        this._rewardAdUnitId = this._rewardAdUnitIds[MiniRewardAdPlacement.Default] || "";
        this._interstitialAdUnitId = config.interstitialAdId || "";

        Object.keys(this._rewardAdUnitIds).forEach((placementKey) => {
            const placement = placementKey as MiniRewardAdPlacement;
            const adUnitId = this._rewardAdUnitIds[placement];
            if (!adUnitId || this._rewardAdContexts.has(placement)) {
                return;
            }

            Log("创建支付宝激励广告", placement, adUnitId);
            this._rewardAdContexts.set(placement, this.createRewardAdContext(placement, adUnitId));
        });
    }

    public showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        const placement = options?.placement || MiniRewardAdPlacement.Default;
        const context = this._rewardAdContexts.get(placement);
        if (!context) {
            Warn(MiniErrorCode.AD_NOT_INIT.msg);
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }
        if (this._showingPlacement) {
            Warn(MiniErrorCode.AD_PLAYING.msg);
            res.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }

        Log("显示支付宝激励广告", placement, context.adUnitId);

        this._showingPlacement = placement;
        context.success = res.success;
        context.fail = res.fail;

        context.ad.show().then(() => {
            this._rewardListener?.onShow();
        }).catch(() => {
            context.ad.load().then(() => {
                context.ad.show().then(() => {
                    this._rewardListener?.onShow();
                }).catch((error) => {
                    this.failContext(context, error?.error || error?.errCode, error?.errorMessage || error?.errMsg);
                });
            }).catch((error) => {
                this.failContext(context, error?.error || error?.errCode, error?.errorMessage || error?.errMsg);
            });
        });
    }

    protected createVideoAd(): AliyMiniprogram.RewardedAd {
        return null;
    }

    private createRewardAdContext(placement: MiniRewardAdPlacement, adUnitId: string): AliRewardAdContext {
        const context: AliRewardAdContext = {
            placement,
            adUnitId,
            ad: my.createRewardedAd({ adUnitId, multiton: true }),
            success: null,
            fail: null,
        };
        /** 广告加载失败 */
        context.ad.onError((res: AliyMiniprogram.CallBack.Fail) => {
            console.error(JSON.stringify(res));
            console.log("ali video load onError:", res.error, 'message:', res.errorMessage);
        });

        context.ad.onLoad(() => {
            Log("ali ads video onload success", placement);
        });

        context.ad.onClose((res: { isEnded: boolean }) => {
            if ((res && res.isEnded) || res === undefined) {
                /** 广告播放完成 */
                context.success?.();

                this._rewardListener?.onClose();
            } else {
                /** 中途退出，不发放奖励 */
                context.fail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.resetContext(context);
        });
        return context;
    }

    private failContext(context: AliRewardAdContext, errCode?: number, errMsg?: string): void {
        context.fail?.(errCode || MiniErrorCode.AD_NOT_INIT.code, errMsg || MiniErrorCode.AD_NOT_INIT.msg);
        this.resetContext(context);
    }

    private resetContext(context: AliRewardAdContext): void {
        context.success = null;
        context.fail = null;
        this._showingPlacement = null;
    }

}
