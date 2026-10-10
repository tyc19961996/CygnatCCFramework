import { native } from "cc";
import { Platform } from "../../Core";
import type { LoginResult } from "../interface/IMiniCommon";
import type { HarmonyAccountChangedEvent, HarmonyPlayerRole } from "../interface/IHarmonyAccount";
import { HarmonyAccountClient, HarmonyAccountRequest } from "./HarmonyAccountClient";

const bridge = "entry/src/main/ets/cygnat/CygnatHarmonyAccountBridge";
const call = (method: string, parameter = ""): unknown => native.reflection.callStaticMethod(bridge, `entry/${method}`, parameter, true);
const client = new HarmonyAccountClient({
    getProtocolVersion: () => { try { return Platform.isHarmonyOS ? call("getProtocolVersion") as number : null; } catch { return null; } },
    submit: (request: HarmonyAccountRequest) => call("submit", JSON.stringify(request)) === true,
    drainEvents: () => {
        const events: unknown = JSON.parse(call("drainEvents") as string);
        if (!Array.isArray(events)) throw new Error("鸿蒙账号事件协议无效");
        return events;
    },
});

export class HarmonyAccount {
    /** 只由用户点击触发；失败后不会自动再次弹窗。 */
    public static switchAccount(): Promise<LoginResult> { return client.login(true); }
    /** 普通登录不强制显示官方账号选择界面。 */
    public static login(): Promise<LoginResult> { return client.login(); }
    public static onAccountChanged(handler: (event: HarmonyAccountChangedEvent) => void): () => void {
        if (!Platform.isHarmonyOS) return () => {};
        return client.onAccountChanged(handler);
    }
    public static reportRole(role: HarmonyPlayerRole): Promise<void> { return client.reportRole(role); }
}
