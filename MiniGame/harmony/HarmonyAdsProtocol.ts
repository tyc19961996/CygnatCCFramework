/** 鸿蒙广告桥接协议版本。 */
export const HARMONY_ADS_PROTOCOL_VERSION = 1 as const;

export type HarmonyAdAction = "showReward" | "showInterstitial";
export type HarmonyAdEventType = "accepted" | "opened" | "rewarded" | "closed" | "error";

export interface HarmonyAdRequest {
    version: typeof HARMONY_ADS_PROTOCOL_VERSION;
    requestId: string;
    action: HarmonyAdAction;
    adId: string;
    placement?: string;
}

export interface HarmonyAdEvent {
    version: number;
    requestId: string;
    type: HarmonyAdEventType;
    code?: number | string;
    message?: string;
}

/** 过滤原生端返回的未知数据，避免脏数据进入广告状态机。 */
export function isHarmonyAdEvent(value: unknown): value is HarmonyAdEvent {
    if (!value || typeof value !== "object") return false;
    const input = value as Record<string, unknown>;
    return typeof input.version === "number"
        && typeof input.requestId === "string"
        && (
            input.type === "accepted"
            || input.type === "opened"
            || input.type === "rewarded"
            || input.type === "closed"
            || input.type === "error"
        );
}
