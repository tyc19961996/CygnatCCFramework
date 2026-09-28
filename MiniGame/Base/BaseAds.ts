import { MiniErrorCode } from "../header";
import {
    IMiniAdsListener,
    IMiniBannerAdsListener,
    IMiniRewardAdInitConfig,
    IMiniRewardAds,
    IMiniShowBannerAdOptions,
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniBannerAdCallback,
    MiniBannerAdStyle,
    MiniRewardAdPlacement,
} from "../interface/IMiniAds";

/**
 * 广告基类。平台子类只需要创建各自的广告实例，生命周期和错误回调由这里统一处理。
 */
export class BaseAds<T, B, C = any> implements IMiniRewardAds {
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
    /** Banner 广告ID */
    protected _bannerAdUnitId: string = "";
    /** Banner 广告实例，首次展示时惰性创建 */
    protected _bannerAd: C = null;
    /** Banner 最近一次创建参数 */
    protected _bannerOptions: IMiniShowBannerAdOptions = null;

    protected _rewardListener: IMiniAdsListener = null;
    protected _interstitialListener: IMiniAdsListener = null;
    protected _bannerListener: IMiniBannerAdsListener = null;

    /** 广告成功回调 */
    protected _rewardSuccess: () => void;
    /** 广告失败回调 */
    protected _rewardFail: (errCode: number, errMsg: string) => void;
    /** 插屏广告成功回调 */
    protected _interstitialAdSuccess: () => void;
    /** 插屏广告失败回调 */
    protected _interstitialAdFail: (errCode: number, errMsg: string) => void;
    /** Banner 广告成功回调 */
    protected _bannerSuccess: () => void;
    /** Banner 广告失败回调 */
    protected _bannerFail: (errCode: number, errMsg: string) => void;
    /** 当前 Banner 请求是否已经结算 */
    protected _bannerCallbackSettled = true;
    /** 当前 Banner 错误是否已通知监听器 */
    protected _bannerErrorReported = false;

    public init(rewardAdUnitId: string, interstitialUnitId?: string, bannerAdUnitId?: string): void;
    public init(config: IMiniRewardAdInitConfig): void;
    public init(
        rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig,
        interstitialUnitId?: string,
        bannerAdUnitId?: string,
    ): void {
        const config = this.normalizeInitConfig(rewardAdUnitIdOrConfig, interstitialUnitId, bannerAdUnitId);
        const previousBannerAdUnitId = this._bannerAdUnitId;

        this._rewardAdUnitIds = config.rewardAdIds || {};
        this._rewardAdUnitId = this._rewardAdUnitIds[MiniRewardAdPlacement.Default] || "";
        this._interstitialAdUnitId = config.interstitialAdId || "";
        this._bannerAdUnitId = config.bannerAdId || "";

        if (previousBannerAdUnitId !== this._bannerAdUnitId) {
            this.destroyBannerAd();
        }

        if (this._rewardAdUnitId && !this._rewardAd) {
            console.log("创建激励广告");
            this._rewardAd = this.createVideoAd();
        }

        if (this._interstitialAdUnitId && !this._interstitialAd) {
            console.log("创建插屏广告");
            this._interstitialAd = this.createInterstitialAd();
        }
    }

    protected normalizeInitConfig(
        rewardAdUnitIdOrConfig: string | IMiniRewardAdInitConfig,
        interstitialUnitId?: string,
        bannerAdUnitId?: string,
    ): IMiniRewardAdInitConfig {
        if (typeof rewardAdUnitIdOrConfig === "string") {
            return {
                defaultRewardAdId: rewardAdUnitIdOrConfig,
                rewardAdIds: rewardAdUnitIdOrConfig
                    ? { [MiniRewardAdPlacement.Default]: rewardAdUnitIdOrConfig }
                    : {},
                interstitialAdId: interstitialUnitId,
                bannerAdId: bannerAdUnitId,
            };
        }

        const input = rewardAdUnitIdOrConfig || {};
        const rewardAdIds: Partial<Record<MiniRewardAdPlacement, string>> = {
            ...(input.rewardAdIds || {}),
        };

        if (input.defaultRewardAdId && !rewardAdIds[MiniRewardAdPlacement.Default]) {
            rewardAdIds[MiniRewardAdPlacement.Default] = input.defaultRewardAdId;
        }

        return {
            defaultRewardAdId: rewardAdIds[MiniRewardAdPlacement.Default],
            rewardAdIds,
            interstitialAdId: input.interstitialAdId || "",
            bannerAdId: input.bannerAdId || "",
            appId: input.appId,
            isDebug: input.isDebug,
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
        res?.success?.();
    }

    protected createVideoAd(): T {
        return null;
    }

    protected createInterstitialAd(): B {
        return null;
    }

    /** 平台子类覆写此方法创建自己的 Banner 实例。 */
    protected createBannerAd(_options?: IMiniShowBannerAdOptions): C {
        return null;
    }

    /** 生成平台创建函数使用的跨平台参数。 */
    protected getBannerCreateOptions(options?: IMiniShowBannerAdOptions): {
        adUnitId: string;
        style?: MiniBannerAdStyle;
        adIntervals?: number;
    } {
        const result: {
            adUnitId: string;
            style?: MiniBannerAdStyle;
            adIntervals?: number;
        } = { adUnitId: this._bannerAdUnitId };

        if (options?.style) {
            result.style = { ...options.style };
        }
        if (options?.adIntervals !== undefined) {
            result.adIntervals = options.adIntervals;
        }
        return result;
    }

    /** 显示 Banner 广告。 */
    public showBannerAd(options?: IMiniShowBannerAdOptions, res?: MiniBannerAdCallback): void {
        const normalizedOptions = options || {};
        this._bannerErrorReported = false;

        if (!this._bannerAdUnitId) {
            this.failBannerRequest(res, MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }

        if (!this._bannerCallbackSettled) {
            res?.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }

        try {
            if (
                this._bannerAd &&
                this._bannerOptions?.adIntervals !== undefined &&
                normalizedOptions.adIntervals !== undefined &&
                this._bannerOptions.adIntervals !== normalizedOptions.adIntervals
            ) {
                this.destroyBannerAd();
            }

            if (!this._bannerAd) {
                this._bannerOptions = this.cloneBannerOptions(normalizedOptions);
                this._bannerAd = this.createBannerAd(normalizedOptions);
                if (!this._bannerAd) {
                    this.failBannerRequest(res, MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
                    return;
                }
                this.bindBannerEvents(this._bannerAd);
            } else {
                this.applyBannerStyle(this._bannerAd, normalizedOptions.style);
            }

            this._bannerSuccess = res?.success;
            this._bannerFail = res?.fail;
            this._bannerCallbackSettled = false;
            this._bannerErrorReported = false;

            const ad: any = this._bannerAd as any;
            if (typeof ad.show !== "function") {
                this.failBanner({ code: MiniErrorCode.AD_NOT_INIT.code, msg: MiniErrorCode.AD_NOT_INIT.msg });
                return;
            }
            const result = ad.show();
            if (result && typeof result.then === "function") {
                Promise.resolve(result)
                    .then(() => this.completeBannerShow())
                    .catch((error) => this.failBanner(error));
            } else {
                this.completeBannerShow();
            }
        } catch (error) {
            this.failBanner(error);
        }
    }

    /** 隐藏 Banner 实例。 */
    public hideBannerAd(): void {
        const ad: any = this._bannerAd as any;
        if (!ad || typeof ad.hide !== "function") return;

        try {
            const result = ad.hide();
            if (result && typeof result.catch === "function") {
                result.catch((error: unknown) => this.notifyBannerError(error));
            }
        } catch (error) {
            this.notifyBannerError(error);
        }
    }

    /** 销毁 Banner 实例并清理回调。 */
    public destroyBannerAd(): void {
        const ad: any = this._bannerAd as any;
        if (ad) {
            try {
                if (typeof ad.hide === "function") {
                    const hideResult = ad.hide();
                    if (hideResult && typeof hideResult.catch === "function") {
                        hideResult.catch((error: unknown) => this.notifyBannerError(error));
                    }
                }
            } catch (error) {
                this.notifyBannerError(error);
            }
            try {
                if (typeof ad.destroy === "function") {
                    const destroyResult = ad.destroy();
                    if (destroyResult && typeof destroyResult.catch === "function") {
                        destroyResult.catch((error: unknown) => this.notifyBannerError(error));
                    }
                }
            } catch (error) {
                this.notifyBannerError(error);
            }
        }

        this._bannerAd = null;
        this._bannerOptions = null;
        this._bannerSuccess = null;
        this._bannerFail = null;
        this._bannerCallbackSettled = true;
        this._bannerErrorReported = false;
    }

    /** 设置 Banner 监听器。 */
    public setBannerAdsListener(listener: IMiniBannerAdsListener): void {
        this._bannerListener = listener || null;
    }

    showInterstitialAd(res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void }): void {
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

    private cloneBannerOptions(options: IMiniShowBannerAdOptions): IMiniShowBannerAdOptions {
        return {
            adIntervals: options?.adIntervals,
            style: options?.style ? { ...options.style } : undefined,
        };
    }

    private applyBannerStyle(ad: any, style?: MiniBannerAdStyle): void {
        if (!ad?.style || !style) return;
        try {
            Object.assign(ad.style, style);
        } catch (error) {
            this.notifyBannerError(error);
        }
    }

    private bindBannerEvents(ad: any): void {
        if (typeof ad.onLoad === "function") {
            ad.onLoad(() => undefined);
        }
        if (typeof ad.onError === "function") {
            ad.onError((error: unknown) => this.failBanner(error));
        }
        if (typeof ad.onResize === "function") {
            ad.onResize((size: any) => {
                if (typeof size?.width !== "number" || typeof size?.height !== "number") return;
                this._bannerListener?.onResize?.({ width: size.width, height: size.height });
            });
        }
        if (typeof ad.onClose === "function") {
            ad.onClose(() => this._bannerListener?.onClose?.());
        }
        if (typeof ad.onShow === "function") {
            ad.onShow(() => this.completeBannerShow());
        }
    }

    private completeBannerShow(): void {
        if (this._bannerCallbackSettled) return;
        this._bannerCallbackSettled = true;
        const success = this._bannerSuccess;
        this._bannerSuccess = null;
        this._bannerFail = null;
        success?.();
        this._bannerListener?.onShow?.();
    }

    private failBanner(error: unknown): void {
        const [code, message] = this.getBannerError(error);
        if (!this._bannerCallbackSettled) {
            this._bannerCallbackSettled = true;
            const fail = this._bannerFail;
            this._bannerSuccess = null;
            this._bannerFail = null;
            fail?.(code, message);
        }
        this.notifyBannerError(error, code, message);
    }

    private failBannerRequest(res: MiniBannerAdCallback | undefined, code: number, message: string): void {
        res?.fail?.(code, message);
        this.notifyBannerError(undefined, code, message);
    }

    private notifyBannerError(error: unknown, code?: number, message?: string): void {
        if (this._bannerErrorReported) return;
        this._bannerErrorReported = true;
        const normalized = code === undefined || message === undefined
            ? this.getBannerError(error)
            : [code, message] as [number, string];
        this._bannerListener?.onError?.(normalized[0], normalized[1]);
    }

    private getBannerError(error: any): [number, string] {
        const codeValue = error?.errCode ?? error?.errorCode ?? error?.code ?? error?.error;
        const code = codeValue === undefined || codeValue === null || codeValue === ""
            ? MiniErrorCode.AD_NOT_INIT.code
            : Number(codeValue);
        const message = error?.errMsg || error?.errorMessage || error?.msg || error?.message || MiniErrorCode.AD_NOT_INIT.msg;
        return [Number.isNaN(code) ? MiniErrorCode.AD_NOT_INIT.code : code, String(message)];
    }
}
