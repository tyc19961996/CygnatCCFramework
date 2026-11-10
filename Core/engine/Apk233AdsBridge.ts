import { native } from "cc";

const BRIDGE_CLASS = "com/cygnat/apk233/Cygnat233AdsBridge";

export function callApk233Bridge(method: string, signature: string, ...args: string[]): unknown {
    return native.reflection.callStaticMethod(BRIDGE_CLASS, method, signature, ...args);
}

export function getApk233BridgeVersion(): number {
    try {
        const version = callApk233Bridge("getProtocolVersion", "()I");
        return typeof version === "number" && Number.isInteger(version) && version > 0 ? version : 0;
    } catch {
        return 0;
    }
}
