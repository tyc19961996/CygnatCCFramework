import type { LoginResult } from "../interface/IMiniCommon";
import type { HarmonyAccountChangedEvent, HarmonyPlayerRole } from "../interface/IHarmonyAccount";

export interface HarmonyAccountRequest {
    version: number;
    requestId: string;
    action: "login" | "switchAccount" | "reportRole";
    role?: HarmonyPlayerRole;
}

export interface HarmonyAccountTransport {
    getProtocolVersion(): number | null;
    submit(request: HarmonyAccountRequest): boolean;
    drainEvents(): unknown[];
}

interface AccountTimers {
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
}

interface PendingRequest {
    id: string;
    action: HarmonyAccountRequest["action"];
    resolve: (result: LoginResult) => void;
    timer: ReturnType<typeof setTimeout>;
}

const failure = (errCode: number, errMsg: string): LoginResult => ({ success: false, code: "", errCode, errMsg });
const errorMessage = (code: number): string => {
    if ([1002000016, 1001502012, 1002000004].includes(code)) return "用户取消鸿蒙登录或实名认证";
    if ([1002000002, 1001502005].includes(code)) return "鸿蒙账号网络连接失败";
    if (code === -98007) return "原生账号服务尚未初始化，请重新启动游戏";
    if ([1002000017, 1001500001, 1001502014, 401].includes(code)) return "请检查鸿蒙公开 ID、签名指纹与服务配置";
    if (code === -98003) return "官方账号操作尚未结束，请稍后重试";
    if (code === -98004) return "鸿蒙账号操作超时，请等待官方界面关闭后重试";
    if (code === -98005 || code === 1002000015) return "鸿蒙账号已变化，请清理会话后重试";
    if (code === 1002000006) return "鸿蒙玩家未通过防沉迷校验";
    return "鸿蒙账号操作失败，请检查错误码";
};

/** 原生账号单飞与失效边界；授权码只交付一次，不保存在客户端实例。 */
export class HarmonyAccountClient {
    private pending: PendingRequest | null = null;
    private loginPromise: Promise<LoginResult> | null = null;
    private poll: ReturnType<typeof setInterval> | null = null;
    private sequence = 0;
    private generation = 0;
    private player = "";
    private handlers = new Set<(event: HarmonyAccountChangedEvent) => void>();

    constructor(private transport: HarmonyAccountTransport, private timers: AccountTimers = {
        setInterval, clearInterval, setTimeout, clearTimeout,
    }) {}

    public login(switchAccount = false): Promise<LoginResult> {
        if (this.loginPromise) {
            if (this.pending?.action === (switchAccount ? "switchAccount" : "login")) return this.loginPromise;
            return Promise.resolve(failure(-98003, "鸿蒙账号请求正在处理"));
        }
        this.player = "";
        const request = this.request(switchAccount ? "switchAccount" : "login");
        this.loginPromise = request;
        void request.then(() => { if (this.loginPromise === request) this.loginPromise = null; });
        return request;
    }

    public onAccountChanged(handler: (event: HarmonyAccountChangedEvent) => void): () => void {
        this.handlers.add(handler);
        this.startPolling();
        return () => { this.handlers.delete(handler); this.stopPollingIfIdle(); };
    }

    public async reportRole(role: HarmonyPlayerRole): Promise<void> {
        if (!role || !this.player || role.gamePlayerId !== this.player ||
            typeof role.roleId !== "string" || !role.roleId.trim() ||
            typeof role.roleName !== "string" || !role.roleName.trim()) {
            throw Object.assign(new Error("角色必须属于当前已验证的鸿蒙玩家"), { errCode: -98006 });
        }
        const result = await this.request("reportRole", { ...role });
        if (!result.success) throw Object.assign(new Error(result.errMsg), { errCode: result.errCode });
    }

    private request(action: HarmonyAccountRequest["action"], role?: HarmonyPlayerRole): Promise<LoginResult> {
        if (this.pending) return Promise.resolve(failure(-98003, "鸿蒙账号请求正在处理"));
        if (this.transport.getProtocolVersion() !== 1) return Promise.resolve(failure(-98001, "鸿蒙账号桥接未安装或协议不兼容"));
        const requestId = `${Date.now()}-${++this.sequence}`;
        return new Promise((resolve) => {
            const timer = this.timers.setTimeout(() => {
                if (this.pending?.id === requestId) this.finish(failure(-98004, "鸿蒙账号请求超时，请等待官方界面关闭后重试"));
            }, 120000);
            this.pending = { id: requestId, action, resolve, timer };
            this.startPolling();
            try {
                if (!this.transport.submit({ version: 1, requestId, action, role })) this.finish(failure(-98001, "鸿蒙账号桥接未就绪"));
            } catch { this.finish(failure(-98001, "鸿蒙账号桥接调用失败")); }
        });
    }

    private startPolling(): void {
        if (this.poll !== null) return;
        this.poll = this.timers.setInterval(() => {
            try {
                // 同一批事件先失效账号，避免在结果微任务之后才发现账号变化。
                const events = this.transport.drainEvents();
                for (const raw of events) {
                    const event = raw as { version?: number; type?: string; generation?: number };
                    if (event?.version === 1 && event.type === "accountChanged" &&
                        Number.isInteger(event.generation) && event.generation > this.generation) {
                        this.generation = event.generation;
                        this.player = "";
                        this.finish(failure(-98005, "鸿蒙账号已变化，请清理会话后重新登录"));
                        for (const handler of this.handlers) {
                            try { handler({ generation: this.generation }); } catch { /* 隔离业务监听器异常。 */ }
                        }
                    }
                }
                for (const raw of events) {
                    const event = raw as { version?: number; type?: string; requestId?: string; result?: LoginResult };
                    if (event?.version !== 1 || event.type !== "result" || event.requestId !== this.pending?.id) continue;
                    const result = event.result;
                    const valid = result && typeof result.success === "boolean" &&
                        (!result.success || this.pending.action === "reportRole" ||
                            (typeof result.code === "string" && !!result.code && typeof result.gamePlayerId === "string" && !!result.gamePlayerId));
                    if (!valid) this.finish(failure(-98002, "鸿蒙账号返回无效凭据"));
                    else if (!result.success) {
                        const code = Number.isFinite(result.errCode) ? result.errCode : -98002;
                        this.finish(failure(code, errorMessage(code)));
                    }
                    else {
                        if (this.pending.action !== "reportRole") this.player = result.gamePlayerId;
                        this.finish({ success: true, code: result.code || "", ...(result.gamePlayerId ? { gamePlayerId: result.gamePlayerId } : {}) });
                    }
                }
            } catch { this.finish(failure(-98002, "鸿蒙账号事件读取失败")); }
        }, 50);
    }

    private finish(result: LoginResult): void {
        const pending = this.pending;
        if (!pending) return;
        this.pending = null;
        this.timers.clearTimeout(pending.timer);
        if (!result.success) this.player = "";
        pending.resolve(result);
        this.stopPollingIfIdle();
    }

    private stopPollingIfIdle(): void {
        // 登录后持续监听官方欢迎条的账号变化。
        if (this.pending || this.player || this.handlers.size || this.poll === null) return;
        this.timers.clearInterval(this.poll);
        this.poll = null;
    }
}
