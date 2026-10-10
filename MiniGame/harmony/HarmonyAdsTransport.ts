import { native } from "cc";
import {
    HarmonyAdEvent,
    HarmonyAdRequest,
    isHarmonyAdEvent,
} from "./HarmonyAdsProtocol";

export const HARMONY_ADS_BRIDGE_CLASS = "entry/src/main/ets/cygnat/CygnatHarmonyAdsBridge";
export const HARMONY_ADS_BRIDGE_MODULE = "entry";

export interface IHarmonyAdsTransport {
    getProtocolVersion(): number | null;
    submit(request: HarmonyAdRequest): boolean;
    drainEvents(): HarmonyAdEvent[];
}

/**
 * Cocos 3.8.5 鸿蒙同步反射传输层。
 *
 * 这里只允许短同步调用：submit 立即返回，异步广告生命周期通过 Worker 队列排空。
 */
export class HarmonyAdsTransport implements IHarmonyAdsTransport {
    public getProtocolVersion(): number | null {
        try {
            const result = native.reflection.callStaticMethod(
                HARMONY_ADS_BRIDGE_CLASS,
                `${HARMONY_ADS_BRIDGE_MODULE}/getProtocolVersion`,
                "",
                true,
            );
            return typeof result === "number" && Number.isFinite(result) ? result : null;
        } catch {
            return null;
        }
    }

    public submit(request: HarmonyAdRequest): boolean {
        try {
            return native.reflection.callStaticMethod(
                HARMONY_ADS_BRIDGE_CLASS,
                `${HARMONY_ADS_BRIDGE_MODULE}/submit`,
                JSON.stringify(request),
                true,
            ) === true;
        } catch {
            return false;
        }
    }

    public drainEvents(): HarmonyAdEvent[] {
        const result = native.reflection.callStaticMethod(
            HARMONY_ADS_BRIDGE_CLASS,
            `${HARMONY_ADS_BRIDGE_MODULE}/drainEvents`,
            "",
            true,
        );
        if (typeof result !== "string" || !result) {
            throw new Error("鸿蒙广告桥接返回了无效的事件队列");
        }
        const parsed: unknown = JSON.parse(result);
        if (!Array.isArray(parsed) || !parsed.every(isHarmonyAdEvent)) {
            throw new Error("鸿蒙广告桥接返回了无效的事件协议");
        }
        return parsed;
    }
}
