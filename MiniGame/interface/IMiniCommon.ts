/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 小游戏一些通用方法
 */

export interface TouchPoint {
    identifier: number;
    screenX: number;
    screenY: number;
}

export interface TouchData {
    touches: TouchPoint[];
    changedTouches: TouchPoint[];
    timeStamp: number;
}

export interface LoginResult {
    success: boolean;
    code: string;
    /** 是否已登录（仅抖音返回） */
    isLogin?: boolean;
    /** 匿名登录凭证（仅抖音返回） */
    anonymousCode?: string;
    errCode?: number;
    errMsg?: string;
}

export interface SubscribeResult {
    success: boolean;
    data: Record<string, boolean>;
    errCode?: number;
    errMsg?: string;
}

export interface ReportSceneOptions {
    /** 场景 ID，在平台后台配置 */
    sceneId: number;
    /** 场景耗时，单位 ms */
    costTime?: number;
    /** 自定义维度数据，value 需为字符串 */
    dimension?: Record<string, string>;
    /** 自定义指标数据，value 需为数值字符串 */
    metric?: Record<string, string>;
}

export interface IMiniCommon {
    /**
     * 分享
     */
    shareAppMessage(
        options: { title?: string, desc?: string, imageUrl?: string, query?: string },
        success?: () => void,
        fail?: (e) => void,
        complete?: () => void
    ): void;

    /**
     * 获取冷启动参数
     */
    getLaunchOptions(): Record<string, any>;
    /**
     * 获取热启动参数
     */
    getHotLaunchOptions(): Record<string, any>;

    /**
     * 添加 onShow 回调，返回回调 ID
     */
    addOnShowCallback(callback: (options: Record<string, any>) => void): number;

    /**
     * 通过 ID 移除 onShow 回调
     */
    removeOnShowCallback(id: number): void;

    /**
     * 移除全部 onShow 回调
     */
    removeAllOnShowCallbacks(): void;

    /**
     * 添加触摸开始回调，返回回调 ID
     */
    addTouchStartCallback(callback: (data: TouchData) => void): number;

    /**
     * 通过 ID 移除触摸开始回调
     */
    removeTouchStartCallback(id: number): void;

    /**
     * 添加触摸移动回调，返回回调 ID
     */
    addTouchMoveCallback(callback: (data: TouchData) => void): number;

    /**
     * 通过 ID 移除触摸移动回调
     */
    removeTouchMoveCallback(id: number): void;

    /**
     * 添加触摸结束回调，返回回调 ID
     */
    addTouchEndCallback(callback: (data: TouchData) => void): number;

    /**
     * 通过 ID 移除触摸结束回调
     */
    removeTouchEndCallback(id: number): void;

    /**
     * 添加触摸取消回调，返回回调 ID
     */
    addTouchCancelCallback(callback: (data: TouchData) => void): number;

    /**
     * 通过 ID 移除触摸取消回调
     */
    removeTouchCancelCallback(id: number): void;

    /**
     * 移除全部触摸回调
     */
    removeAllTouchCallbacks(): void;

    /**
     * 获取基础库版本号
     */
    getLibVersion(): string;

    /** 
     * 获取运行平台 合法值（ios | android | ohos | windows | mac | devtools | iPad）
     * 微信上 iPad 会返回 ios
     */
    getPlatform(): 'ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools' | 'iPad';

    /**
     * 获取运行类型
     * 合法值（release | debug）
     */
    getEnvType(): 'release' | 'debug';

    /** 
     * 宿主程序版本 (这里指微信、抖音、支付宝版本)
     */
    getHostVersion(): string;

    /**
     * 获取屏幕尺寸
     */
    getScreenSize(): { width: number, height: number };

    /** 
     * 退出小程序
     */
    exitMiniProgram(): void;

    /**
     * 复制到剪切板
     */
    setClipboardData(text: string): void;

    /** 震动 */
    vibrateShort(): void;
    /** 长震动 */
    vibrateLong(): void;

    /** 请求授权 */
    authorize(scope: string): Promise<boolean>;

    /** 是否授权 */
    isAuthorized(scope: string): Promise<boolean>;

    /** 获取用户信息 */
    getUserInfo(): Promise<any>;

    /** 获取设置 */
    getSetting(withSubscriptions?:boolean): Promise<any>;

    /** 创建用户信息按钮 */
    createUserInfoButton(options: any): any;

    /** 删除用户信息按钮 */
    destroyUserInfoBtn():void;

    /** 隐私协议授权查询 */
    requirePrivacyAuthorize(): Promise<boolean>;

    /** 请求订阅消息 */
    requestSubscribeMessage(tmplIds: string[]): Promise<SubscribeResult>;

    /** 请求系统订阅消息（仅微信支持） */
    requestSubscribeSystemMessage(msgTypeList: string[]): Promise<SubscribeResult>;

    /** 是否支持订阅消息 */
    canSubscribeMessage(): boolean;

    /** 是否支持系统订阅消息 */
    canSubscribeSystemMessage(): boolean;

    /** 检查侧边栏是否存在（仅抖音支持） */
    checkSidebar(): Promise<boolean>;

    /** 打开侧边栏（仅抖音支持） */
    openSidebar(): Promise<boolean>;

    /** 是否支持添加小游戏快捷方式到手机桌面（仅 Bilibili、快手、抖音支持） */
    canAddShortcut(): boolean;

    /** 添加小游戏快捷方式到手机桌面（仅 Bilibili、快手、抖音支持，调用前可先判断 canAddShortcut） */
    addShortcut(): Promise<boolean>;

    /** 检查小游戏快捷方式是否已添加到手机桌面（仅 Bilibili、快手、抖音 Android 支持） */
    checkShortcut(): Promise<boolean>;

    /** 判断游戏中心是否能够添加到支付宝首页（仅支付宝支持，基础库 2.1.57 或更高版本） */
    canAddGameCenterToMyApps(): Promise<boolean>;

    /** 添加游戏中心到支付宝首页（仅支付宝支持，调用前可先判断 canAddGameCenterToMyApps，调用后弹出确认面板需用户手动确认） */
    addGameCenterToMyApps(): Promise<boolean>;

    /**
     * 上报自定义埋点事件
     * - 支付宝：my.gameBiz.reportCustomEvent，内部判空
     * - 微信：wx.reportEvent，data 的 value 仅支持字符串与整数（bool 转 'true'/'false'，小数转整数）
     * - 抖音：tt.reportAnalytics
     * - Bilibili：bl.reportEvent，仅支持数字事件码（event 需传如 "3001"），不支持 data
     * - 快手：不支持，空实现
     */
    reportEvent(event: string, data?: { [key: string]: any }): void;

    /** 跳转支付宝游戏中心（仅支付宝支持，my.ap.openURL 优先，否则 my.navigateToMiniProgram） */
    jumpToGameCenter(): Promise<boolean>;

    /** 是否支持启动场景值上报（支付宝不支持） */
    canReportScene(): boolean;

    /** 上报启动场景值（微信、Bilibili、快手、抖音支持，调用前可先判断 canReportScene） */
    reportScene(options: ReportSceneOptions): Promise<boolean>;

    /** 登录获取 code */
    login(force?: boolean): Promise<LoginResult>;
}
