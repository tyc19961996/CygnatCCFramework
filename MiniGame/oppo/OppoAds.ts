/** OPPO 小游戏广告适配。 */

import { Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import {
    IMiniRewardAdInitConfig,
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

export class OppoAds extends BaseAds<OppoMinigame.RewardedVideoAd, OppoMinigame.InterstitialAd> {
    private _adServiceInitialized = false;

    public init(rewardAdUnitId: string, interstitialUnitId?: string): void;
    public init(config: IMiniRewardAdInitConfig): void;
    public init(rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig, interstitialUnitId?: string): void {
        const config = typeof rewardAdUnitIdOrConfig === "string"
            ? { defaultRewardAdId: rewardAdUnitIdOrConfig, interstitialAdId: interstitialUnitId }
            : (rewardAdUnitIdOrConfig || {});

        if (config.appId && qg.initAdService && !this._adServiceInitialized) {
            qg.initAdService({
                appId: config.appId,
                isDebug: config.isDebug,
                fail: (error) => Warn(`OPPO 广告服务初始化失败 ${this.getErrorMessage(error)}`),
            });
            this._adServiceInitialized = true;
        }

        super.init(rewardAdUnitIdOrConfig as any, interstitialUnitId);
    }

    public showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        const placement = options?.placement || MiniRewardAdPlacement.Default;
        if (placement !== MiniRewardAdPlacement.Default) {
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, "OPPO 当前只支持默认激励广告位");
            return;
        }
        if (!this._rewardAdUnitId || !this._rewardAd) {
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }
        if (this._rewardSuccess) {
            res.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }

        this._rewardSuccess = res.success;
        this._rewardFail = res.fail;

        Promise.resolve(this._rewardAd.load())
            .then(() => this._rewardAd.show())
            .then(() => this._rewardListener?.onShow())
            .catch((error) => this.failReward(error));
    }

    protected createVideoAd(): OppoMinigame.RewardedVideoAd {
        if (!qg.createRewardedVideoAd) return null;
        const videoAd = qg.createRewardedVideoAd({ adUnitId: this._rewardAdUnitId });
        videoAd.onLoad(() => Log("OPPO 激励广告加载成功"));
        videoAd.onError((error) => Warn(`OPPO 激励广告失败 ${this.getErrorMessage(error)}`));
        videoAd.onClose((result) => {
            if (result?.isEnded) {
                this._rewardSuccess?.();
                this._rewardListener?.onClose();
            } else {
                this._rewardFail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.reset();
        });
        return videoAd;
    }

    public showInterstitialAd(res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void }): void {
        if (!this._interstitialAdUnitId || !this._interstitialAd) {
            res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }

        this._interstitialAdSuccess = res?.success;
        this._interstitialAdFail = res?.fail;

        Promise.resolve(this._interstitialAd.load())
            .then(() => this._interstitialAd.show())
            .then(() => this._interstitialListener?.onShow())
            .catch((error) => this.failInterstitial(error));
    }

    protected createInterstitialAd(): OppoMinigame.InterstitialAd {
        if (!qg.createInterstitialAd) return null;
        const interstitialAd = qg.createInterstitialAd({ adUnitId: this._interstitialAdUnitId });
        interstitialAd.onLoad(() => Log("OPPO 插屏广告加载成功"));
        interstitialAd.onError((error) => Warn(`OPPO 插屏广告失败 ${this.getErrorMessage(error)}`));
        interstitialAd.onClose(() => {
            this._interstitialAdSuccess?.();
            this._interstitialListener?.onClose();
            this.clearInterstitialCallbacks();
        });
        return interstitialAd;
    }

    private failReward(error: OppoMinigame.ErrorResult): void {
        this._rewardFail?.(this.getErrorCode(error), this.getErrorMessage(error));
        this.reset();
    }

    private failInterstitial(error: OppoMinigame.ErrorResult): void {
        this._interstitialAdFail?.(this.getErrorCode(error), this.getErrorMessage(error));
        this.clearInterstitialCallbacks();
    }

    private clearInterstitialCallbacks(): void {
        this._interstitialAdSuccess = null;
        this._interstitialAdFail = null;
    }

    private getErrorCode(error: OppoMinigame.ErrorResult): number {
        const code = error?.errCode ?? error?.code;
        return code == null || code === "" ? MiniErrorCode.AD_NOT_INIT.code : Number(code);
    }

    private getErrorMessage(error: OppoMinigame.ErrorResult): string {
        return error?.errMsg || error?.msg || MiniErrorCode.AD_NOT_INIT.msg;
    }
}
