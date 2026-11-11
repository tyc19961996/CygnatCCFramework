import { native } from "cc";
import { Platform } from "../../Core";
import type { LoginResult } from "../interface/IMiniCommon";

export interface Apk233AccountConfig {
    appKey: string;
    cpId: string;
}

export interface Apk233AccountChangedEvent {
    generation: number;
    reason: "logout" | "changed";
}

type NativeEvent = {
    type: string;
    requestId?: string;
    generation?: number;
    reason?: string;
    uid?: string;
    sid?: string;
    code?: number;
    message?: string;
};

type PendingRequest = {
    id: string;
    deadline: number;
    finish: (event: NativeEvent) => void;
} & (
    { kind: "init"; promise: Promise<void>; config: Apk233AccountConfig }
    | { kind: "login"; promise: Promise<LoginResult> }
);

const BRIDGE = "com/cygnat/apk233/Cygnat233AccountBridge";
const UNAVAILABLE = { type: "error", code: -97101, message: "233 APK 账号桥接不可用" };
const INVALIDATED = { type: "error", code: -97104, message: "233 APK 登录已失效" };
const TIMEOUT = { type: "error", code: -97105, message: "233 APK 账号请求超时，请完全关闭游戏后重新打开" };

function reflect(method: string, signature: string, ...args: string[]): unknown {
    return native.reflection.callStaticMethod(BRIDGE, method, signature, ...args);
}

function failure(event: NativeEvent): LoginResult {
    return { success: false, code: "", errCode: event.code, errMsg: event.message ?? "233 APK 登录失败" };
}

/** 233 APK 账号入口。宿主在隐私授权后显式初始化。 */
export class Apk233Account {
    private static initialized = false;
    private static hasAccount = false;
    private static pending: PendingRequest | null = null;
    private static sequence = 0;
    private static generation = 0;
    private static timer: ReturnType<typeof setInterval> | null = null;
    private static readonly handlers = new Set<(event: Apk233AccountChangedEvent) => void>();

    public static init(config: Apk233AccountConfig): Promise<void> {
        const appKey = config?.appKey?.trim();
        const cpId = config?.cpId?.trim();
        if (!appKey || !cpId) return Promise.reject(new Error("请配置 233 APK 登录 appKey 和 cpId"));

        const pending = this.pending;
        if (pending?.kind === "init" && pending.config.appKey === appKey && pending.config.cpId === cpId) {
            return pending.promise;
        }
        if (pending) return Promise.reject(new Error("233 APK 账号已有请求正在处理"));

        const id = this.nextId();
        let finish: (event: NativeEvent) => void;
        const promise = new Promise<void>((resolve, reject) => {
            finish = (event) => {
                if (event.type === "initialized") {
                    this.initialized = true;
                    resolve();
                } else {
                    reject(Object.assign(new Error(event.message ?? "233 APK 初始化失败"), { code: event.code }));
                }
            };
        });
        this.pending = { id, kind: "init", config: { appKey, cpId }, deadline: Date.now() + 35_000, promise, finish };
        this.submit({ requestId: id, kind: "init", appKey, cpId });
        return promise;
    }

    public static login(): Promise<LoginResult> {
        const pending = this.pending;
        if (pending?.kind === "login") return pending.promise;
        if (!this.initialized || pending) {
            return Promise.resolve(failure({ type: "error", code: -97102, message: "请先完成 233 APK 账号初始化" }));
        }

        const id = this.nextId();
        let finish: (event: NativeEvent) => void;
        const promise = new Promise<LoginResult>((resolve) => {
            finish = (event) => {
                if (event.type === "loggedIn" && Number.isSafeInteger(event.generation) && event.generation >= this.generation
                    && typeof event.uid === "string" && event.uid.trim()
                    && typeof event.sid === "string" && event.sid.trim()) {
                    this.generation = event.generation;
                    this.hasAccount = true;
                    resolve({ success: true, uid: event.uid, sid: event.sid, code: event.sid });
                } else {
                    resolve(failure(event.type === "loggedIn" ? INVALIDATED : event));
                }
            };
        });
        this.pending = { id, kind: "login", deadline: Date.now() + 185_000, promise, finish };
        this.submit({ requestId: id, kind: "login" });
        return promise;
    }

    public static onAccountChanged(handler: (event: Apk233AccountChangedEvent) => void): () => void {
        if (!Platform.isApk233) return () => {};
        const subscription = (event: Apk233AccountChangedEvent) => handler(event);
        this.handlers.add(subscription);
        this.updateTimer();
        return () => {
            this.handlers.delete(subscription);
            this.updateTimer();
        };
    }

    private static nextId(): string {
        return Date.now() + "-" + ++this.sequence;
    }

    private static submit(request: object): void {
        try {
            if (Platform.isApk233 && reflect("getProtocolVersion", "()I") === 1
                && reflect("submit", "(Ljava/lang/String;)Z", JSON.stringify(request)) === true) {
                this.updateTimer();
                return;
            }
        } catch {
            // 只装广告的 APK 没有登录反射类。
        }
        this.complete(UNAVAILABLE);
        this.updateTimer();
    }

    private static complete(event: NativeEvent): void {
        const pending = this.pending;
        this.pending = null;
        pending?.finish(event);
    }

    private static updateTimer(): void {
        if (this.pending || (this.initialized && this.handlers.size)) {
            this.timer ??= setInterval(() => this.poll(), 100);
        } else if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private static poll(): void {
        let events: NativeEvent[];
        try {
            const raw = reflect("drainEvents", "()Ljava/lang/String;");
            if (typeof raw !== "string") throw new Error(UNAVAILABLE.message);
            events = JSON.parse(raw);
            if (!Array.isArray(events)) throw new Error(UNAVAILABLE.message);
        } catch {
            this.initialized = false;
            this.complete(UNAVAILABLE);
            this.updateTimer();
            return;
        }

        const changes: Apk233AccountChangedEvent[] = [];
        const hadAccount = this.hasAccount;
        for (const event of events) {
            if (!event || !Number.isSafeInteger(event.generation) || event.generation <= this.generation) continue;
            if (event.type === "detached") {
                this.generation = event.generation;
                this.initialized = false;
                this.hasAccount = false;
                changes.length = 0;
                if (hadAccount) changes.push({ generation: event.generation, reason: "logout" });
            } else if (event.type === "account" && (event.reason === "logout" || event.reason === "changed")) {
                this.generation = event.generation;
                this.hasAccount = false;
                changes.push({ generation: event.generation, reason: event.reason });
            }
        }
        // 同批账号变更使旧凭证失效，先结清在途请求再通知业务层。
        for (const event of events) {
            const pending = this.pending;
            if (!event || !pending || pending.id !== event.requestId) continue;
            if (event.type === "error" || (pending.kind === "init" && event.type === "initialized")
                || (pending.kind === "login" && event.type === "loggedIn")) {
                this.complete(event);
            }
        }
        if (this.pending?.kind === "login" && !this.initialized) this.complete(INVALIDATED);
        if (this.pending && Date.now() >= this.pending.deadline) this.complete(TIMEOUT);

        for (const event of changes) {
            for (const handler of [...this.handlers]) {
                try {
                    handler({ ...event });
                } catch {
                    // 隔离业务回调异常，避免阻断其他订阅者。
                }
            }
        }
        this.updateTimer();
    }
}
