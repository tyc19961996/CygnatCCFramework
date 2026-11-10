import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import { MiniRewardAdPlacement } from "../interface/IMiniAds";
import type {
    IMiniRewardAdInitConfig,
    IMiniShowBannerAdOptions,
    IMiniShowRewardAdOptions,
    MiniAdCallback,
    MiniBannerAdCallback,
} from "../interface/IMiniAds";
import { callApk233Bridge, getApk233BridgeVersion } from "../../Core/engine/Apk233AdsBridge";

type AdKind = "reward" | "interstitial" | "banner";
type AdError = { code: number; msg: string };

interface AdRequest {
    requestId: string;
    kind: AdKind;
    deadline: number;
    opened: boolean;
    rewarded: boolean;
    closing: boolean;
    callback?: MiniBannerAdCallback;
}

interface AdEvent {
    requestId: string;
    type: "opened" | "rewarded" | "closed" | "error";
    code?: number;
    message?: string;
}

const REQUEST_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 100;
const BANNER_CLOSE_TIMEOUT_MS = 15_000;
const BRIDGE_ERROR = { code: MiniErrorCode.AD_BRIDGE_UNAVAILABLE.code, msg: "233 APK 广告桥接不可用" };

export class Apk233Ads extends BaseAds<never, never, never> {
    private appKey = "";
    private debug = false;
    private sequence = 0;
    private fullScreen: AdRequest | null = null;
    private banner: AdRequest | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;

    public init(rewardAdUnitId: string, interstitialUnitId?: string, bannerAdUnitId?: string): void;
    public init(config: IMiniRewardAdInitConfig): void;
    public init(configOrRewardId: string | IMiniRewardAdInitConfig, interstitialId?: string, bannerId?: string): void {
        const config = this.normalizeInitConfig(configOrRewardId, interstitialId, bannerId);
        const appKey = config.appId?.trim() || "";
        if (this.appKey !== appKey) this.destroyBannerAd();
        super.init(config);
        this.appKey = appKey;
        this.debug = config.isDebug === true;
    }

    public showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        const placement = options?.placement ?? MiniRewardAdPlacement.Default;
        this.show("reward", this._rewardAdUnitIds[placement], res);
    }

    public showInterstitialAd(res?: MiniBannerAdCallback): void {
        this.show("interstitial", this._interstitialAdUnitId, res);
    }

    public showBannerAd(_options?: IMiniShowBannerAdOptions, res?: MiniBannerAdCallback): void {
        if (this.banner?.opened && !this.banner.closing) {
            res?.success?.();
            return;
        }
        this.show("banner", this._bannerAdUnitId, res);
    }

    public hideBannerAd(): void {
        const banner = this.banner;
        if (!banner || banner.closing) return;
        banner.closing = true;
        if (!this.closeNativeBanner(banner.requestId)) {
            this.finish(banner, BRIDGE_ERROR);
            return;
        }
        banner.deadline = Date.now() + BANNER_CLOSE_TIMEOUT_MS;
    }

    public destroyBannerAd(): void {
        this.hideBannerAd();
    }

    private show(kind: AdKind, id: string | undefined, callback?: MiniBannerAdCallback): void {
        const adId = id?.trim() ?? "";
        const pos = Number(adId);
        if (!this.appKey || !/^\d+$/.test(adId) || pos > 2147483647) {
            this.fail(kind, callback, { code: MiniErrorCode.AD_NOT_INIT.code, msg: "请配置 233 APK appKey 和整数广告位 POS" });
            return;
        }
        if (kind === "banner" ? this.banner : this.fullScreen) {
            this.fail(kind, callback, MiniErrorCode.AD_PLAYING);
            return;
        }
        const version = getApk233BridgeVersion();
        if (version !== 1) {
            this.fail(kind, callback, version === 0 ? BRIDGE_ERROR : {
                code: MiniErrorCode.AD_PROTOCOL_MISMATCH.code,
                msg: "233 APK 广告桥接协议版本不匹配",
            });
            return;
        }

        const request: AdRequest = {
            requestId: Date.now() + "-" + ++this.sequence,
            kind,
            deadline: Date.now() + REQUEST_TIMEOUT_MS,
            opened: false,
            rewarded: false,
            closing: false,
            callback,
        };
        if (kind === "banner") this.banner = request;
        else this.fullScreen = request;

        if (!this.submit({ requestId: request.requestId, kind, pos, appKey: this.appKey, debug: this.debug })) {
            this.finish(request, BRIDGE_ERROR);
            return;
        }
        this.timer ??= setInterval(() => this.poll(), POLL_INTERVAL_MS);
    }

    private submit(body: object): boolean {
        try {
            return callApk233Bridge("submit", "(Ljava/lang/String;)Z", JSON.stringify(body)) === true;
        } catch {
            return false;
        }
    }

    private closeNativeBanner(requestId: string): boolean {
        return this.submit({ requestId, kind: "closeBanner" });
    }

    private releaseNativeRequest(request: AdRequest): void {
        if (request.kind === "banner") this.closeNativeBanner(request.requestId);
        else this.submit({ requestId: request.requestId, kind: "expireFullScreen" });
    }

    private poll(): void {
        let events: AdEvent[];
        try {
            const result: unknown = callApk233Bridge("drainEvents", "()Ljava/lang/String;");
            if (typeof result !== "string") throw new Error(BRIDGE_ERROR.msg);
            events = JSON.parse(result);
            if (!Array.isArray(events)) throw new Error(BRIDGE_ERROR.msg);
        } catch {
            for (const request of [this.fullScreen, this.banner]) {
                if (request) {
                    this.releaseNativeRequest(request);
                    this.finish(request, BRIDGE_ERROR);
                }
            }
            return;
        }

        // 返回游戏线程后先处理已到达的终态，避免误判为超时。
        for (const event of events) {
            if (!event) continue;
            const request = this.fullScreen?.requestId === event.requestId ? this.fullScreen : this.banner;
            if (request?.requestId === event.requestId) this.handleEvent(request, event);
        }
        for (const request of [this.fullScreen, this.banner]) {
            if (request && Date.now() >= request.deadline) {
                this.releaseNativeRequest(request);
                this.finish(request, { code: MiniErrorCode.AD_TIMEOUT.code, msg: "233 APK 广告请求超时" });
            }
        }
    }

    private handleEvent(request: AdRequest, event: AdEvent): void {
        switch (event.type) {
            case "opened":
                if (request.opened || request.closing) return;
                request.opened = true;
                if (request.kind === "banner") {
                    request.deadline = Infinity;
                    const callback = request.callback;
                    request.callback = undefined;
                    this.notify(() => this._bannerListener?.onShow?.());
                    this.notify(() => callback?.success?.());
                } else {
                    this.notify(() => this.listener(request.kind)?.onShow?.());
                }
                break;
            case "rewarded":
                request.rewarded = true;
                break;
            case "closed": {
                const completed = request.kind === "reward" ? request.rewarded : request.opened;
                this.finish(request, completed ? undefined : MiniErrorCode.AD_EXIT, !request.closing);
                break;
            }
            case "error":
                this.finish(request, {
                    code: typeof event.code === "number" ? event.code : MiniErrorCode.AD_NATIVE_ERROR.code,
                    msg: event.message || "233 APK 原生广告执行失败",
                });
                break;
        }
    }

    private listener(kind: AdKind) {
        if (kind === "banner") return this._bannerListener;
        return kind === "reward" ? this._rewardListener : this._interstitialListener;
    }

    private finish(request: AdRequest, error?: AdError, reportBannerError = true): void {
        const current = request.kind === "banner" ? this.banner : this.fullScreen;
        if (current !== request) return;
        if (request.kind === "banner") this.banner = null;
        else this.fullScreen = null;

        if (!this.fullScreen && !this.banner && this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (request.opened && !(request.closing && error)) {
            this.notify(() => this.listener(request.kind)?.onClose?.());
        }
        if (error) this.fail(request.kind, request.callback, error, reportBannerError);
        else this.notify(() => request.callback?.success?.());
    }

    private fail(kind: AdKind, callback: MiniBannerAdCallback | undefined, error: AdError, reportBannerError = true): void {
        this.notify(() => callback?.fail?.(error.code, error.msg));
        if (kind === "banner" && reportBannerError) {
            this.notify(() => this._bannerListener?.onError?.(error.code, error.msg));
        }
    }

    private notify(callback: () => void): void {
        try {
            callback();
        } catch (error) {
            console.error("233 APK 广告回调执行失败", error);
        }
    }
}
