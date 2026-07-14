declare namespace KuaiShouMiniprogram {
    interface FailResult {
        /**
         * 错误码
         */
        code?: number;
        /**
         * 错误信息
         */
        msg?: string;
        /**
         * 部分接口返回的错误信息字段
         */
        errMsg?: string;
    }

    interface CallbackOptions<TSuccess = unknown, TFail = FailResult> {
        success?: (res: TSuccess) => void;
        fail?: (res: TFail) => void;
        complete?: () => void;
    }

    interface LaunchOptions {
        /**
         * 入口来源
         */
        from?: string;
        /**
         * 启动或切前台参数
         */
        query?: Record<string, string>;
    }

    interface TouchPoint {
        /**
         * 触摸点标识
         */
        identifier: number;
        /**
         * 距离屏幕左边的距离
         */
        clientX: number;
        /**
         * 距离屏幕上边的距离
         */
        clientY: number;
        /**
         * 距离屏幕左边的距离
         */
        pageX?: number;
        /**
         * 距离屏幕上边的距离
         */
        pageY?: number;
    }

    interface TouchEvent {
        /**
         * 当前停留在屏幕中的触摸点
         */
        touches: TouchPoint[];
        /**
         * 本次变化的触摸点
         */
        changedTouches: TouchPoint[];
        /**
         * 事件时间戳
         */
        timeStamp: number;
    }

    interface SafeArea {
        left: number;
        right: number;
        top: number;
        bottom: number;
        width: number;
        height: number;
    }

    interface SystemInfo {
        /**
         * 设备品牌
         */
        brand: string;
        /**
         * 设备型号
         */
        model: string;
        /**
         * 客户端平台
         */
        platform: string;
        /**
         * 操作系统及版本
         */
        system: string;
        /**
         * 快手宿主版本号
         */
        version: string;
        /**
         * 客户端基础库版本。部分小游戏环境可能不返回该字段。
         */
        SDKVersion?: string;
        /**
         * 屏幕宽度
         */
        screenWidth: number;
        /**
         * 屏幕高度
         */
        screenHeight: number;
        /**
         * 可使用窗口宽度
         */
        windowWidth: number;
        /**
         * 可使用窗口高度
         */
        windowHeight: number;
        /**
         * 设备像素比
         */
        pixelRatio: number;
        /**
         * 状态栏高度
         */
        statusBarHeight?: number;
        /**
         * 安全区域
         */
        safeArea?: SafeArea;
    }

    interface ExitMiniProgramOptions extends CallbackOptions<void> {
    }

    type VibrateShortType = "light" | "medium" | "heavy";

    interface VibrateShortOptions extends CallbackOptions<void> {
        /**
         * 震动强度
         */
        type: VibrateShortType;
    }

    interface VibrateLongOptions extends CallbackOptions<void> {
    }

    interface ShareAppMessageOptions extends CallbackOptions<void> {
        /**
         * 分享模板 id
         */
        templateId?: string;
        /**
         * 查询字符串
         */
        query?: string;
    }

    type AuthorizationScope = "scope.userInfo" | "scope.userLocation" | "scope.writePhotosAlbum" | "scope.camera" | "scope.record";

    interface AuthorizeOptions extends CallbackOptions<void> {
        /**
         * 需要获取的权限
         */
        scope: AuthorizationScope;
    }

    interface AuthSetting {
        "scope.userInfo"?: boolean;
        "scope.userLocation"?: boolean;
        "scope.writePhotosAlbum"?: boolean;
        "scope.camera"?: boolean;
        "scope.record"?: boolean;
        [scope: string]: boolean | undefined;
    }

    interface GetSettingResult {
        /**
         * 小游戏文档返回 result 承载授权状态
         */
        result?: AuthSetting;
        /**
         * 兼容部分环境直接返回授权状态
         */
        [scope: string]: AuthSetting | boolean | undefined;
    }

    interface GetSettingOptions extends CallbackOptions<GetSettingResult> {
    }

    interface UserInfo {
        /**
         * 用户昵称
         */
        nickName: string;
        /**
         * 用户头像
         */
        avatarUrl: string;
        /**
         * 用户性别
         */
        gender?: number;
    }

    interface GetUserInfoResult {
        userInfo: UserInfo;
        rawData?: string;
        signature?: string;
        encryptedData?: string;
        iv?: string;
    }

    interface GetUserInfoOptions extends CallbackOptions<GetUserInfoResult> {
        /**
         * 是否带上登录态信息
         */
        withCredentials?: boolean;
    }

    interface LoginResult {
        /**
         * 用户登录凭证
         */
        code: string;
    }

    interface LoginOptions extends CallbackOptions<LoginResult> {
    }

    interface CheckSliderBarIsAvailableResult {
        /**
         * 侧边栏是否可用
         */
        available: boolean;
    }

    interface CheckSliderBarIsAvailableOptions extends CallbackOptions<CheckSliderBarIsAvailableResult> {
    }

    type NavigateToSceneName = "sidebar";

    interface NavigateToSceneOptions extends CallbackOptions<void> {
        /**
         * 需要跳转的场景
         */
        scene: NavigateToSceneName;
    }

    interface AddShortcutResult {
        /**
         * 1 表示成功
         */
        code: number;
        /**
         * 成功或失败信息
         */
        msg: string;
    }

    interface AddShortcutOptions extends CallbackOptions<AddShortcutResult> {
    }

    interface CheckShortcutResult {
        /**
         * 1 表示成功
         */
        code: number;
        /**
         * 是否已添加快捷方式
         */
        installed: boolean;
    }

    interface CheckShortcutOptions extends CallbackOptions<CheckShortcutResult> {
    }

    interface ReportSceneResult {
        errMsg: "reportScene:ok" | string;
        data?: Record<string, unknown>;
    }

    interface ReportSceneFailResult extends FailResult {
        errNo?: number;
    }

    interface ReportSceneOptions extends CallbackOptions<ReportSceneResult, ReportSceneFailResult> {
        /**
         * 场景 ID
         */
        sceneId: number;
        /**
         * 场景耗时，单位 ms
         */
        costTime?: number;
        /**
         * 自定义维度数据
         */
        dimension?: Record<string, string>;
        /**
         * 自定义指标数据
         */
        metric?: Record<string, string>;
    }

    interface AdErrorEvent {
        /**
         * 错误码
         */
        code: number;
        /**
         * 错误信息
         */
        msg: string;
    }

    const interstitalAdErrCodes: readonly [
        4,
        1006,
        2003,
        2004,
        2005,
        2006
    ];
    /**
     * @value 4 广告校验失败
     * @value 1006 小程序启动一定时间内不允许展示插屏广告
     * @value 2003 当前正在播放插屏广告，不允许再次展示插屏广告
     * @value 2004 广告渲染失败
     * @value 2005 插屏广告实例不允许跨页面调用
     * @value 2006 插屏广告实例已经销毁
     */
    type InterstitalAdErrCode = typeof interstitalAdErrCodes[number];
    interface InterstitialAdErrorEvent extends AdErrorEvent {
        /**
         * 错误码
         */
        code: InterstitalAdErrCode;
        /**
         * 错误信息
         */
        msg: string;
    }

    interface CreateInterstitialAdOptions {
        /**
         * 广告单元 id
         */
        adUnitId: string;
    }

    /**
     * 插屏广告组件。
     */
    interface InterstitialAd {
        /**
         * 显示插屏广告。
         */
        show(): Promise<void>;
        /**
         * 销毁插屏广告实例。
         */
        destroy(): void;
        /**
         * 监听插屏错误事件。
         */
        onError(callback: (event: InterstitialAdErrorEvent) => void): void;
        /**
         * 移除插屏错误事件的监听函数。
         */
        offError(callback?: (event: InterstitialAdErrorEvent) => void): void;
        /**
         * 监听插屏广告关闭事件。
         */
        onClose(callback: () => void): void;
        /**
         * 移除插屏广告关闭事件的监听函数。
         */
        offClose(callback?: () => void): void;
    }

    const rewardedVideoAdErrCodes: readonly [
        0,
        1,
        2,
        3,
        4,
        5,
        1006
    ];

    interface RewardedVideoAdCloseEvent {
        /**
         * 用户是否完整观看了激励视频广告
         */
        isEnded: boolean;
        /**
         * 多例广告发放奖励次数
         */
        count?: number;
    }

    /**
     * @value 0 内部错误
     * @value 1 广告对象已关闭
     * @value 2 广告数据暂未准备好
     * @value 3 网络错误
     * @value 4 广告校验失败
     * @value 5 详情页正在展示
     * @value 1006 过早展示广告，需在规定时间后再展示广告
     */
    type RewardedVideoAdErrCode = typeof rewardedVideoAdErrCodes[number];
    interface RewardedVideoAdErrorEvent extends AdErrorEvent {
        /**
         * 错误码
         */
        code: RewardedVideoAdErrCode;
        /**
         * 错误信息
         */
        msg: string;
    }

    interface CreateRewardedVideoAdOptions {
        /**
         * 广告单元 id
         */
        adUnitId: string;
        /**
         * 是否启用多例模式
         */
        multiton?: boolean;
        /**
         * 多例广告奖励提示文案
         */
        multitonRewardMsg?: string[];
        /**
         * 多例广告奖励次数
         */
        multitonRewardTimes?: number;
    }

    /**
     * 激励视频广告。
     */
    interface RewardedVideoAd {
        /**
         * 展示激励视频广告。
         */
        show(): Promise<void>;
        /**
         * 销毁激励视频广告实例。
         */
        destroy(): void;
        /**
         * 监听激励视频广告出错事件。
         */
        onError(callback: (event: RewardedVideoAdErrorEvent) => void): void;
        /**
         * 取消监听激励视频广告出错事件。
         */
        offError(callback?: (event: RewardedVideoAdErrorEvent) => void): void;
        /**
         * 监听激励视频广告关闭事件。
         */
        onClose(callback: (event: RewardedVideoAdCloseEvent) => void): void;
        /**
         * 取消监听激励视频广告关闭事件。
         */
        offClose(callback?: (event: RewardedVideoAdCloseEvent) => void): void;
    }

    interface KS {
        /**
         * 获取小游戏启动参数。
         */
        getLaunchOptionsSync(): LaunchOptions;

        /**
         * 监听小游戏切前台事件。
         */
        onShow(callback: (options: LaunchOptions) => void): void;

        /**
         * 取消监听小游戏切前台事件。
         */
        offShow(callback?: (options: LaunchOptions) => void): void;

        /**
         * 监听触摸开始事件。
         */
        onTouchStart(callback: (res: TouchEvent) => void): void;

        /**
         * 监听触摸移动事件。
         */
        onTouchMove(callback: (res: TouchEvent) => void): void;

        /**
         * 监听触摸结束事件。
         */
        onTouchEnd(callback: (res: TouchEvent) => void): void;

        /**
         * 监听触摸取消事件。
         */
        onTouchCancel(callback: (res: TouchEvent) => void): void;

        /**
         * 获取系统信息。
         */
        getSystemInfoSync(): SystemInfo;

        /**
         * 退出当前小游戏。
         */
        exitMiniProgram(options?: ExitMiniProgramOptions): void;

        /**
         * 使手机发生短震动。
         */
        vibrateShort(options: VibrateShortOptions): void;

        /**
         * 使手机发生长震动。
         */
        vibrateLong(options?: VibrateLongOptions): void;

        /**
         * 主动拉起转发。
         */
        shareAppMessage(options: ShareAppMessageOptions): void;

        /**
         * 提前向用户发起授权请求。
         */
        authorize(options: AuthorizeOptions): void;

        /**
         * 获取用户授权设置。
         */
        getSetting(options: GetSettingOptions): void;

        /**
         * 获取用户信息。
         */
        getUserInfo(options: GetUserInfoOptions): void;

        /**
         * 登录获取 code。
         */
        login(options: LoginOptions): void;

        /**
         * 查询当前是否支持侧边栏复访能力。
         */
        checkSliderBarIsAvailable(options: CheckSliderBarIsAvailableOptions): void;

        /**
         * 跳转到指定场景。
         */
        navigateToScene(options: NavigateToSceneOptions): void;

        /**
         * 添加小游戏快捷方式到手机桌面。
         */
        addShortcut?(options: AddShortcutOptions): void;

        /**
         * 检查小游戏快捷方式是否已添加到手机桌面。
         */
        checkShortcut?(options: CheckShortcutOptions): void;

        /**
         * 上报启动场景值。
         */
        reportScene?(options: ReportSceneOptions): void;

        /**
         * 创建激励视频广告实例。
         */
        createRewardedVideoAd(options: CreateRewardedVideoAdOptions): RewardedVideoAd;

        /**
         * 创建插屏广告实例。
         */
        createInterstitialAd(options: CreateInterstitialAdOptions): InterstitialAd;
    }
}

declare const ks: KuaiShouMiniprogram.KS;
