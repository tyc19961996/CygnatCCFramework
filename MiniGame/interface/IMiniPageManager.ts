/** 微信开放页面的加载参数。openlink 由具体能力渠道提供。 */
export interface MiniPageManagerLoadOptions {
    openlink: string;
    extraData?: Record<string, unknown>;
    query?: Record<string, unknown>;
}

/** 已加载后可不传参数直接展示；也可提供 openlink 连贯加载并展示。 */
export interface MiniPageManagerShowOptions {
    openlink?: string;
    extraData?: Record<string, unknown>;
    query?: Record<string, unknown>;
}

/** 微信开放页面管理器。渠道定义事件名称和异步返回内容。 */
export interface MiniPageManager {
    load(options: MiniPageManagerLoadOptions): Promise<unknown>;
    show(options?: MiniPageManagerShowOptions): Promise<unknown>;
    /** 事件载荷由渠道定义，允许业务回调声明具体参数类型。 */
    on(eventName: string, callback: (...args: any[]) => void): void;
    off(eventName: string, callback?: (...args: any[]) => void): void;
    destroy(): void;
}
