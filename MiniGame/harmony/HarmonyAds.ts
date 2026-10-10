import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";
import { MiniRewardAdPlacement } from "../interface/IMiniAds";
import type {
    IMiniShowRewardAdOptions,
    MiniAdCallback,
} from "../interface/IMiniAds";
import {
    HARMONY_ADS_PROTOCOL_VERSION,
    HarmonyAdEvent,
    HarmonyAdRequest,
} from "./HarmonyAdsProtocol";
import {
    HarmonyAdsTransport,
    IHarmonyAdsTransport,
} from "./HarmonyAdsTransport";

export interface HarmonyAdsOptions {
    pollIntervalMs?: number;
    acceptedTimeoutMs?: number;
    requestTimeoutMs?: number;
}

export interface HarmonyAdsRuntime {
    now(): number;
    setInterval(handler: () => void, timeoutMs: number): unknown;
    clearInterval(handle: unknown): void;
}

type HarmonyAdKind = "reward" | "interstitial";

interface HarmonyActiveRequest {
    requestId: string;
    kind: HarmonyAdKind;
    startedAt: number;
    accepted: boolean;
    opened: boolean;
    rewarded: boolean;
    success?: () => void;
    fail?: (errCode: number, errMsg: string) => void;
}

const DEFAULT_OPTIONS: Required<HarmonyAdsOptions> = {
    pollIntervalMs: 100,
    acceptedTimeoutMs: 5000,
    requestTimeoutMs: 180000,
};

const DEFAULT_RUNTIME: HarmonyAdsRuntime = {
    now: () => Date.now(),
    setInterval: (handler, timeoutMs) => globalThis.setInterval(handler, timeoutMs),
    clearInterval: (handle) => globalThis.clearInterval(handle as number),
};

/**
 * HarmonyOS NEXT 广告适配。
 *
 * 原生端只负责真实广告生命周期，本类负责互斥、超时和业务回调的唯一结算。
 */
export class HarmonyAds extends BaseAds<never, never> {
    private readonly _transport: IHarmonyAdsTransport;
    private readonly _options: Required<HarmonyAdsOptions>;
    private readonly _runtime: HarmonyAdsRuntime;
    private _activeRequest: HarmonyActiveRequest = null;
    private _pollHandle: unknown = null;
    private _requestSequence = 0;

    constructor(
        transport: IHarmonyAdsTransport = new HarmonyAdsTransport(),
        options: HarmonyAdsOptions = {},
        runtime: HarmonyAdsRuntime = DEFAULT_RUNTIME,
    ) {
        super();
        this._transport = transport;
        this._options = { ...DEFAULT_OPTIONS, ...options };
        this._runtime = runtime;
    }

    public showRewardAd(options: IMiniShowRewardAdOptions, res: MiniAdCallback): void {
        if (this._activeRequest) {
            res?.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }

        const placement = options?.placement || MiniRewardAdPlacement.Default;
        const adId = this._rewardAdUnitIds[placement]
            || (placement === MiniRewardAdPlacement.Default ? this._rewardAdUnitId : "");
        if (!adId) {
            res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }

        this.startRequest("reward", adId, placement, res);
    }

    public showInterstitialAd(
        res?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void },
    ): void {
        if (this._activeRequest) {
            res?.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }
        if (!this._interstitialAdUnitId) {
            res?.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }

        this.startRequest("interstitial", this._interstitialAdUnitId, undefined, res);
    }

    private startRequest(
        kind: HarmonyAdKind,
        adId: string,
        placement: MiniRewardAdPlacement | undefined,
        callback?: { success?: () => void; fail?: (errCode: number, errMsg: string) => void },
    ): void {
        const nativeVersion = this._transport.getProtocolVersion();
        if (nativeVersion === null) {
            callback?.fail?.(MiniErrorCode.AD_BRIDGE_UNAVAILABLE.code, MiniErrorCode.AD_BRIDGE_UNAVAILABLE.msg);
            return;
        }
        if (nativeVersion !== HARMONY_ADS_PROTOCOL_VERSION) {
            callback?.fail?.(MiniErrorCode.AD_PROTOCOL_MISMATCH.code, MiniErrorCode.AD_PROTOCOL_MISMATCH.msg);
            return;
        }

        const requestId = `harmony-ad-${this._runtime.now()}-${++this._requestSequence}`;
        const request: HarmonyAdRequest = {
            version: HARMONY_ADS_PROTOCOL_VERSION,
            requestId,
            action: kind === "reward" ? "showReward" : "showInterstitial",
            adId,
            placement,
        };
        this._activeRequest = {
            requestId,
            kind,
            startedAt: this._runtime.now(),
            accepted: false,
            opened: false,
            rewarded: false,
            success: callback?.success,
            fail: callback?.fail,
        };

        if (!this._transport.submit(request)) {
            this.settleFailure(
                MiniErrorCode.AD_BRIDGE_UNAVAILABLE.code,
                MiniErrorCode.AD_BRIDGE_UNAVAILABLE.msg,
            );
            return;
        }

        this._pollHandle = this._runtime.setInterval(
            () => this.pollNativeEvents(),
            this._options.pollIntervalMs,
        );
        this.pollNativeEvents();
    }

    /**
     * 必须先排空队列再看 wall-clock，广告覆盖游戏线程后恢复时不能抢先判超时。
     */
    private pollNativeEvents(): void {
        const requestId = this._activeRequest?.requestId;
        if (!requestId) return;

        let events: HarmonyAdEvent[];
        try {
            events = this._transport.drainEvents();
        } catch {
            this.settleFailure(
                MiniErrorCode.AD_BRIDGE_UNAVAILABLE.code,
                MiniErrorCode.AD_BRIDGE_UNAVAILABLE.msg,
                requestId,
            );
            return;
        }

        for (const event of events) {
            if (this._activeRequest?.requestId !== requestId) return;
            this.handleNativeEvent(event);
        }

        const active = this._activeRequest;
        if (!active || active.requestId !== requestId) return;

        const elapsed = this._runtime.now() - active.startedAt;
        if (!active.accepted && elapsed >= this._options.acceptedTimeoutMs) {
            this.settleFailure(MiniErrorCode.AD_TIMEOUT.code, MiniErrorCode.AD_TIMEOUT.msg, requestId);
            return;
        }
        if (elapsed >= this._options.requestTimeoutMs) {
            this.settleFailure(MiniErrorCode.AD_TIMEOUT.code, MiniErrorCode.AD_TIMEOUT.msg, requestId);
        }
    }

    private handleNativeEvent(event: HarmonyAdEvent): void {
        const active = this._activeRequest;
        if (!active || event.requestId !== active.requestId) return;

        if (event.version !== HARMONY_ADS_PROTOCOL_VERSION) {
            this.settleFailure(
                MiniErrorCode.AD_PROTOCOL_MISMATCH.code,
                MiniErrorCode.AD_PROTOCOL_MISMATCH.msg,
                active.requestId,
            );
            return;
        }

        switch (event.type) {
            case "accepted":
                active.accepted = true;
                break;
            case "opened":
                if (!active.opened) {
                    active.opened = true;
                    this.notifyListener(active.kind, "onShow");
                }
                break;
            case "rewarded":
                if (active.kind === "reward") active.rewarded = true;
                break;
            case "closed":
                this.settleClosed(active);
                break;
            case "error": {
                const code = this.normalizeNativeErrorCode(event.code);
                const message = event.message || MiniErrorCode.AD_NATIVE_ERROR.msg;
                this.settleFailure(code, message, active.requestId);
                break;
            }
        }
    }

    private getListener(kind: HarmonyAdKind) {
        return kind === "reward" ? this._rewardListener : this._interstitialListener;
    }

    private notifyListener(kind: HarmonyAdKind, event: "onShow" | "onClose"): void {
        const listener = this.getListener(kind);
        if (!listener) return;
        try {
            listener[event]?.call(listener);
        } catch {
            // 业务监听器异常不能破坏广告协议状态机和唯一结算。
        }
    }


    private normalizeNativeErrorCode(code: number | string | undefined): number {
        if (typeof code === "number" && Number.isFinite(code)) return code;
        if (typeof code === "string" && code.trim()) {
            const parsed = Number(code);
            if (Number.isFinite(parsed)) return parsed;
        }
        return MiniErrorCode.AD_NATIVE_ERROR.code;
    }

    private settleClosed(active: HarmonyActiveRequest): void {
        if (this._activeRequest?.requestId !== active.requestId) return;

        const shouldFail = active.kind === "reward" && !active.rewarded;
        const successCallback = active.success;
        const failCallback = active.fail;
        this.clearActiveRequest(active.requestId);
        this.notifyListener(active.kind, "onClose");

        if (shouldFail) {
            failCallback?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
        } else {
            successCallback?.();
        }
    }

    private settleFailure(
        code: number,
        message: string,
        requestId = this._activeRequest?.requestId,
    ): void {
        const active = this._activeRequest;
        if (!active || active.requestId !== requestId) return;
        const callback = active.fail;
        this.clearActiveRequest(requestId);
        callback?.(code, message);
    }

    private clearActiveRequest(requestId?: string): void {
        if (requestId && this._activeRequest?.requestId !== requestId) return;
        if (this._pollHandle !== null) {
            this._runtime.clearInterval(this._pollHandle);
            this._pollHandle = null;
        }
        this._activeRequest = null;
    }
}
