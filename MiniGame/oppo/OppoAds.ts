/** OPPO 小游戏广告适配。 */

import { Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import type {
    IMiniShowNativeTemplateAdOptions,
    MiniNativeTemplateAdCallback,
    MiniNativeTemplateAdStyle,
} from "../interface/IMiniNativeTemplateAds";
import {
    IMiniRewardAdInitConfig,
    IMiniShowBannerAdOptions,
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

interface NativeTemplateState {
    ad: OppoMinigame.CustomAd;
    styleKey: string;
    unbind: Array<() => void>;
}

interface NativeTemplateRequest {
    res?: MiniNativeTemplateAdCallback;
}

export class OppoAds extends BaseAds<OppoMinigame.RewardedVideoAd, OppoMinigame.InterstitialAd, OppoMinigame.BannerAd> {
    private _adServiceInitialized = false;
    private _nativeTemplateAdUnitId = "";
    private _nativeTemplateState: NativeTemplateState = null;
    private _nativeTemplateRequest: NativeTemplateRequest = null;

    public init(rewardAdUnitId: string, interstitialUnitId?: string, bannerAdUnitId?: string): void;
    public init(config: IMiniRewardAdInitConfig): void;
    public init(
        rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig,
        interstitialUnitId?: string,
        bannerAdUnitId?: string,
    ): void {
        const config = typeof rewardAdUnitIdOrConfig === "string"
            ? {
                defaultRewardAdId: rewardAdUnitIdOrConfig,
                interstitialAdId: interstitialUnitId,
                bannerAdId: bannerAdUnitId,
            }
            : (rewardAdUnitIdOrConfig || {});

        this._nativeTemplateAdUnitId = config.nativeTemplateAdId || "";
        this.destroyNativeTemplateAd();

        if (config.appId && qg.initAdService && !this._adServiceInitialized) {
            qg.initAdService({
                appId: config.appId,
                isDebug: config.isDebug,
                fail: (error) => Warn(`OPPO 广告服务初始化失败 ${this.getErrorMessage(error)}`),
            });
            this._adServiceInitialized = true;
        }

        super.init(rewardAdUnitIdOrConfig as any, interstitialUnitId, bannerAdUnitId);
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

    protected createBannerAd(options: IMiniShowBannerAdOptions): OppoMinigame.BannerAd {
        if (!qg.createBannerAd || !this._bannerAdUnitId) return null;
        return qg.createBannerAd(this.getBannerCreateOptions(options));
    }

    public showNativeTemplateAd(options?: IMiniShowNativeTemplateAdOptions, res?: MiniNativeTemplateAdCallback): void {
        if (this._nativeTemplateRequest) {
            res?.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }
        if (!this._nativeTemplateAdUnitId || typeof qg === "undefined" || !qg.createCustomAd) {
            const message = !this._nativeTemplateAdUnitId ? MiniErrorCode.AD_NOT_INIT.msg : "OPPO 原生模板广告接口不可用";
            res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, message);
            this._nativeTemplateListener?.onError?.(MiniErrorCode.AD_NOT_INIT.code, message);
            return;
        }

        const request: NativeTemplateRequest = { res };
        this._nativeTemplateRequest = request;
        try {
            const style = this.cloneNativeTemplateStyle(options?.style);
            const styleKey = JSON.stringify(style || {});
            if (this._nativeTemplateState && this._nativeTemplateState.styleKey !== styleKey) {
                this.releaseNativeTemplateState();
            }
            if (!this._nativeTemplateState) {
                const ad = qg.createCustomAd({
                    adUnitId: this._nativeTemplateAdUnitId,
                    ...(style ? { style } : {}),
                });
                if (!ad) throw new Error("OPPO 原生模板广告创建失败");
                const state: NativeTemplateState = { ad, styleKey, unbind: [] };
                this._nativeTemplateState = state;
                this.bindNativeTemplateEvents(state);
            }
            const state = this._nativeTemplateState;
            // show 自行请求加载；宿主没有单独的 load 方法。
            Promise.resolve(state.ad.show()).then(() => {
                if (this._nativeTemplateState !== state || this._nativeTemplateRequest !== request) return;
                this._nativeTemplateRequest = null;
                request.res?.success?.();
            }, (error) => {
                if (this._nativeTemplateState === state && this._nativeTemplateRequest === request) {
                    this.failNativeTemplate(error);
                }
            });
        } catch (error) {
            if (this._nativeTemplateRequest === request) this.failNativeTemplate(error);
        }
    }

    public hideNativeTemplateAd(): void {
        // 尚未展示完成时销毁实例，防止迟到的展示覆盖隐藏意图。
        if (this._nativeTemplateRequest) {
            this.destroyNativeTemplateAd();
            return;
        }
        const state = this._nativeTemplateState;
        if (!state) return;
        try {
            state.ad.hide();
        } catch (error) {
            if (this._nativeTemplateState === state) this.failNativeTemplate(error);
        }
    }

    public destroyNativeTemplateAd(): void {
        const request = this._nativeTemplateRequest;
        this._nativeTemplateRequest = null;
        this.releaseNativeTemplateState();
        request?.res?.fail?.(MiniErrorCode.AD_EXIT.code, "原生模板广告请求已取消");
    }

    private cloneNativeTemplateStyle(style?: MiniNativeTemplateAdStyle): MiniNativeTemplateAdStyle | undefined {
        if (!style) return undefined;
        const result: MiniNativeTemplateAdStyle = {};
        for (const key of ["top", "left", "width"] as const) {
            if (style[key] !== undefined) result[key] = style[key];
        }
        return result;
    }

    private bindNativeTemplateEvents(state: NativeTemplateState): void {
        const { ad } = state;
        const active = () => this._nativeTemplateState === state;
        const onLoad = () => { if (active()) this._nativeTemplateListener?.onLoad?.(); };
        const onShow = () => { if (active()) this._nativeTemplateListener?.onShow?.(); };
        const onHide = () => { if (active()) this._nativeTemplateListener?.onHide?.(); };
        const onClick = (event: OppoMinigame.CustomAdClickEvent) => {
            if (active()) this._nativeTemplateListener?.onClick?.(event);
        };
        const onError = (error: OppoMinigame.ErrorResult) => { if (active()) this.failNativeTemplate(error); };
        // 逐项登记，注册中途抛错也能解绑已经注册的监听。
        state.unbind.push(() => ad.offLoad?.(onLoad));
        ad.onLoad?.(onLoad);
        state.unbind.push(() => ad.offShow?.(onShow));
        ad.onShow?.(onShow);
        state.unbind.push(() => ad.offHide?.(onHide));
        ad.onHide?.(onHide);
        state.unbind.push(() => ad.offClick?.(onClick));
        ad.onClick?.(onClick);
        state.unbind.push(() => ad.offError?.(onError));
        ad.onError?.(onError);
    }

    private releaseNativeTemplateState(): void {
        const state = this._nativeTemplateState;
        this._nativeTemplateState = null;
        if (!state) return;
        for (const unbind of state.unbind) {
            try { unbind(); } catch (error) { Warn(`OPPO 原生模板广告解绑失败 ${this.nativeTemplateError(error)[1]}`); }
        }
        try { state.ad.destroy(); } catch (error) {
            Warn(`OPPO 原生模板广告销毁失败 ${this.nativeTemplateError(error)[1]}`);
        }
    }

    private failNativeTemplate(error: unknown): void {
        const [code, message] = this.nativeTemplateError(error);
        const request = this._nativeTemplateRequest;
        this._nativeTemplateRequest = null;
        this.releaseNativeTemplateState();
        request?.res?.fail?.(code, message);
        this._nativeTemplateListener?.onError?.(code, message);
    }

    private nativeTemplateError(error: any): [number, string] {
        const rawCode = error?.errCode ?? error?.code;
        const code = rawCode == null || rawCode === "" ? NaN : Number(rawCode);
        return [Number.isFinite(code) ? code : MiniErrorCode.AD_NOT_INIT.code,
            String(error?.errMsg || error?.msg || error?.message || MiniErrorCode.AD_NOT_INIT.msg)];
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
