/**
 * Bilibili 小游戏 API 最小类型声明。
 *
 * 这里只声明 MiniHelper 适配层当前会用到的 bl API，避免一次性维护整份平台 d.ts。
 * 后续如果接入支付、开放数据域或其他能力，再按实际调用补充对应类型。
 */
declare namespace BilibiliMiniprogram {
    /** Bilibili 异步 API 通用回调结果。 */
    interface CallbackResult {
        /** 平台返回的错误信息，成功时通常为 xxx:ok。 */
        errMsg?: string;
        /** 平台返回的错误码，仅部分接口提供。 */
        errCode?: number;
        /** 个别接口使用 msg 表示错误信息。 */
        msg?: string;
    }

    /** Bilibili 异步 API 通用入参结构。 */
    interface AsyncOptions<T = CallbackResult> {
        /** 接口调用成功回调。 */
        success?: (res: T) => void;
        /** 接口调用失败回调。 */
        fail?: (res: CallbackResult) => void;
        /** 接口调用结束回调，成功失败都会触发。 */
        complete?: (res: CallbackResult) => void;
    }

    /** 冷启动/热启动参数。 */
    interface LaunchOptions {
        /** 启动场景值。 */
        scene?: number | string;
        /** 启动 query 参数。 */
        query?: Record<string, string>;
        /** 来源信息。 */
        referrerInfo?: Record<string, unknown>;
        /** 保留平台后续扩展字段。 */
        [key: string]: unknown;
    }

    /** bl.getSystemInfoSync 返回的系统信息。 */
    interface SystemInfo {
        /** 手机品牌。 */
        brand?: string;
        /** 手机型号。 */
        model?: string;
        /** 设备像素比。 */
        pixelRatio?: number;
        /** 设备像素比，部分版本使用该字段。 */
        devicePixelRatio?: number;
        /** 屏幕宽度。 */
        screenWidth?: number;
        /** 屏幕高度。 */
        screenHeight?: number;
        /** 可使用窗口宽度。 */
        windowWidth?: number;
        /** 可使用窗口高度。 */
        windowHeight?: number;
        /** 状态栏高度。 */
        statusBarHeight?: number;
        /** 系统语言。 */
        language?: string;
        /** Bilibili APP 版本号。 */
        version?: string;
        /** 操作系统版本。 */
        system?: string;
        /** 客户端平台，如 ios/android/devtools。 */
        platform?: string;
        /** Bilibili 小游戏基础库版本。 */
        SDKVersion?: string;
        /** 安全区域。 */
        safeArea?: {
            left: number;
            right: number;
            top: number;
            bottom: number;
            width: number;
            height: number;
        };
        /** Android 设备性能等级。 */
        benchmarkLevel?: number;
    }

    /** 平台触摸点。 */
    interface TouchPoint {
        /** 触点标识。 */
        identifier?: number;
        /** 屏幕横坐标。 */
        screenX?: number;
        /** 屏幕纵坐标。 */
        screenY?: number;
        /** 视口横坐标，部分平台事件使用该字段。 */
        clientX?: number;
        /** 视口纵坐标，部分平台事件使用该字段。 */
        clientY?: number;
        /** 页面横坐标，作为坐标兜底字段。 */
        pageX?: number;
        /** 页面纵坐标，作为坐标兜底字段。 */
        pageY?: number;
    }

    /** 平台触摸事件。 */
    interface TouchEvent {
        /** 当前所有触点；运行时是 TouchList 这类类数组对象，不一定有 Array.map。 */
        touches: ArrayLike<TouchPoint>;
        /** 本次变化的触点；运行时是 TouchList 这类类数组对象，不一定有 Array.map。 */
        changedTouches: ArrayLike<TouchPoint>;
        /** 事件时间戳。 */
        timeStamp: number;
    }

    /** bl.login 成功结果。 */
    interface LoginResult extends CallbackResult {
        /** 登录凭证，有效期由平台控制，服务端用它换 openid/session。 */
        code: string;
    }

    /** bl.getSetting 授权设置结果。 */
    interface GetSettingResult extends CallbackResult {
        /** 各授权 scope 是否已授权。 */
        authSetting: Record<string, boolean>;
        /** 订阅消息设置，当前项目只透传。 */
        subscriptionsSetting?: Record<string, unknown>;
    }

    /** Bilibili 用户基础信息。 */
    interface UserInfo {
        /** 用户昵称。 */
        nickName?: string;
        /** 用户头像。 */
        avatarUrl?: string;
        /** 性别。 */
        gender?: number;
        /** 国家。 */
        country?: string;
        /** 省份。 */
        province?: string;
        /** 城市。 */
        city?: string;
        /** 语言。 */
        language?: string;
        /** 保留平台扩展字段。 */
        [key: string]: unknown;
    }

    /** bl.getUserInfo 用户信息结果。 */
    interface GetUserInfoResult extends CallbackResult {
        /** 用户基础信息。 */
        userInfo?: UserInfo;
        /** 原始用户信息字符串。 */
        rawData?: string;
        /** 签名。 */
        signature?: string;
        /** 加密数据。 */
        encryptedData?: string;
        /** 加密向量。 */
        iv?: string;
    }

    /** 用户信息按钮样式。 */
    interface UserInfoButtonStyle {
        left: number;
        top: number;
        width: number;
        height: number;
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        color?: string;
        textAlign?: "left" | "center" | "right";
        fontSize?: number;
        lineHeight?: number;
    }

    /** 创建用户信息按钮参数。 */
    interface UserInfoButtonOptions {
        type: "text" | "image";
        text?: string;
        image?: string;
        style: UserInfoButtonStyle;
        withCredentials?: boolean;
        lang?: string;
    }

    /** 用户信息按钮实例。 */
    interface UserInfoButton {
        show(): void;
        hide(): void;
        destroy(): void;
        onTap(callback: (res: GetUserInfoResult) => void): void;
        offTap(callback?: (res: GetUserInfoResult) => void): void;
    }

    /** 订阅消息授权结果，key 为模板 id。 */
    interface SubscribeMessageResult extends CallbackResult {
        [templateId: string]: string | number | undefined;
    }

    /** 侧边栏场景检查结果。 */
    interface CheckSceneResult extends CallbackResult {
        /** 文档或不同版本可能返回 isExist。 */
        isExist?: boolean;
        /** 兼容 exist 命名。 */
        exist?: boolean;
        /** 兼容 available 命名。 */
        available?: boolean;
    }

    /** 激励视频关闭事件。 */
    interface RewardedVideoAdCloseEvent {
        /** 是否完整观看。 */
        isEnded?: boolean;
        /** 个别平台以 count > 0 表示获得奖励次数。 */
        count?: number;
    }

    /** 激励视频错误事件。 */
    interface RewardedVideoAdErrorEvent extends CallbackResult {
        /** 广告错误码。 */
        errCode: number;
        /** 广告错误信息。 */
        errMsg: string;
    }

    /** 激励视频广告实例。 */
    interface RewardedVideoAd {
        /** 展示广告。 */
        show(): Promise<void>;
        /** 加载广告。 */
        load(): Promise<void>;
        /** 销毁广告实例。 */
        destroy?(): void;
        /** 监听广告加载完成。 */
        onLoad(callback: () => void): void;
        /** 取消监听广告加载完成。 */
        offLoad?(callback?: () => void): void;
        /** 监听广告关闭。 */
        onClose(callback: (res?: RewardedVideoAdCloseEvent) => void): void;
        /** 取消监听广告关闭。 */
        offClose?(callback?: (res?: RewardedVideoAdCloseEvent) => void): void;
        /** 监听广告错误。 */
        onError(callback: (res: RewardedVideoAdErrorEvent) => void): void;
        /** 取消监听广告错误。 */
        offError?(callback?: (res: RewardedVideoAdErrorEvent) => void): void;
    }

    /** Bilibili 小游戏全局 bl 对象。 */
    interface BL {
        /** 获取冷启动参数。 */
        getLaunchOptionsSync?(): LaunchOptions;
        /** 获取最近一次进入参数。 */
        getEnterOptionsSync?(): LaunchOptions;
        /** 监听小游戏切回前台。 */
        onShow?(callback: (res: LaunchOptions) => void): void;
        /** 取消监听小游戏切回前台。 */
        offShow?(callback?: (res: LaunchOptions) => void): void;
        /** 监听触摸开始。 */
        onTouchStart?(callback: (res: TouchEvent) => void): void;
        /** 监听触摸移动。 */
        onTouchMove?(callback: (res: TouchEvent) => void): void;
        /** 监听触摸结束。 */
        onTouchEnd?(callback: (res: TouchEvent) => void): void;
        /** 监听触摸取消。 */
        onTouchCancel?(callback: (res: TouchEvent) => void): void;
        /** 同步获取系统信息。 */
        getSystemInfoSync?(): SystemInfo;
        /** 退出小游戏。 */
        exitMiniProgram?(options?: AsyncOptions): void;
        /** 设置剪切板内容。 */
        setClipboardData?(options: AsyncOptions & { data: string }): void;
        /** 短震动。 */
        vibrateShort?(options?: AsyncOptions & { type?: "light" | "medium" | "heavy" }): void;
        /** 长震动。 */
        vibrateLong?(options?: AsyncOptions): void;
        /** 主动分享。 */
        shareAppMessage?(options: AsyncOptions & { title?: string; desc?: string; imageUrl?: string; query?: string }): void;
        /** 请求授权。 */
        authorize?(options: AsyncOptions & { scope: string }): void;
        /** 获取授权设置。 */
        getSetting?(options: AsyncOptions<GetSettingResult> & { withSubscriptions?: boolean }): void;
        /** 获取用户信息。 */
        getUserInfo?(options: AsyncOptions<GetUserInfoResult>): void;
        /** 创建用户信息按钮。 */
        createUserInfoButton?(options: UserInfoButtonOptions): UserInfoButton;
        /** 登录获取 code。 */
        login?(options: AsyncOptions<LoginResult>): void;
        /** 请求订阅消息。 */
        requestSubscribeMessage?(options: AsyncOptions<SubscribeMessageResult> & { tmplIds: string[] }): void;
        /** 检查指定场景是否可用，当前用于侧边栏。 */
        checkScene?(options: AsyncOptions<CheckSceneResult> & { scene: string }): void;
        /** 跳转指定场景，当前用于侧边栏。 */
        navigateToScene?(options: AsyncOptions & { scene: string }): void;
        /** 创建激励视频广告；本项目 Bilibili 只接入默认广告位。 */
        createRewardedVideoAd?(options: { adUnitId: string }): RewardedVideoAd;
    }
}

/** Bilibili 小游戏运行时注入的全局对象。 */
declare const bl: BilibiliMiniprogram.BL;
