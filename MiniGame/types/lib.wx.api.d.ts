/**
 * @Author: Gongxh
 * @Date: 2025-03-28
 * @Description: 
 */

declare namespace WechatMiniprogram {
    type IAnyObject = Record<string, any>

    interface ICommonCallBack {
        /**
         * 接口调用成功的回调函数
         */
        success?: () => void;

        /**
         * 接口调用失败的回调函数
         */
        fail?: () => void;

        /**
         * 接口调用结束的回调函数（调用成功、失败都会执行）
         */
        complete?: () => void;
    }

    interface GeneralCallbackResult {
        /** 错误信息 */
        errMsg: string
    }

    interface ReportSceneSuccessCallbackResult {
        /** 开发者上报的原始数据 */
        data?: IAnyObject;
    }

    interface ReportSceneFailCallbackResult {
        /** 错误信息 */
        errMsg: string;
        /** 开发者上报的原始数据 */
        data?: IAnyObject;
    }

    interface ReportSceneOption {
        /** 场景 ID，在管理后台获取 */
        sceneId: number;
        /** 场景耗时，单位 ms */
        costTime?: number;
        /** 自定义维度数据 */
        dimension?: Record<string, string>;
        /** 自定义指标数据 */
        metric?: Record<string, string>;
        /** 接口调用成功的回调函数 */
        success?: (res: ReportSceneSuccessCallbackResult) => void;
        /** 接口调用失败的回调函数 */
        fail?: (res: ReportSceneFailCallbackResult) => void;
        /** 接口调用结束的回调函数 */
        complete?: (res: GeneralCallbackResult) => void;
    }

    interface ConnectSocketOption extends ICommonCallBack {
        /** 开发者服务器 wss 接口地址 */
        url: string

        /** HTTP Header，Header 中不能设置 Referer */
        header?: IAnyObject

        /** 
         * 需要基础库: '1.4.0'
         * 子协议数组 
         */
        protocols?: string[]

        /** 
         * 需要基础库: '2.4.0'
         * 建立 TCP 连接的时候的 TCP_NODELAY 设置
         */
        tcpNoDelay?: boolean

        /** 
         * 需要基础库: '2.8.0'
         * 是否开启压缩扩展
         */
        perMessageDeflate?: boolean

        /** 
         * 需要基础库: '2.10.0'
         * 超时时间，单位为毫秒
         */
        timeout?: number

        /** 
         * 需要基础库: '2.29.0'
         * 强制使用蜂窝网络发送请求
         */
        forceCellularNetwork?: boolean
    }

    /** 
     * 需要基础库： `2.10.4`
     * 网络请求过程中一些调试信息 
     */
    interface SocketProfile {
        /** 组件准备好使用 SOCKET 建立请求的时间，这发生在检查本地缓存之前 */
        fetchStart: number;
        /** DNS 域名查询开始的时间，如果使用了本地缓存（即无 DNS 查询）或持久连接，则与 fetchStart 值相等 */
        domainLookupStart: number;
        /** DNS 域名查询完成的时间，如果使用了本地缓存（即无 DNS 查询）或持久连接，则与 fetchStart 值相等 */
        domainLookupEnd: number;
        /** 开始建立连接的时间，如果是持久连接，则与 fetchStart 值相等。注意如果在传输层发生了错误且重新建立连接，则这里显示的是新建立的连接开始的时间 */
        connectStart: number;
        /** 完成建立连接的时间（完成握手），如果是持久连接，则与 fetchStart 值相等。注意如果在传输层发生了错误且重新建立连接，则这里显示的是新建立的连接完成的时间。注意这里握手结束，包括安全连接建立完成、SOCKS 授权通过 */
        connectEnd: number;
        /** 单次连接的耗时，包括 connect ，tls */
        rtt: number;
        /** 握手耗时 */
        handshakeCost: number;
        /** 上层请求到返回的耗时 */
        cost: number;
    }

    interface SocketSendOption extends ICommonCallBack {
        /** 需要发送的消息 */
        data: string | ArrayBuffer;
    }
    interface SocketCloseOption extends ICommonCallBack {
        /** 
         * 1000（表示正常关闭连接）
         * 关闭代码
         */
        code?: number;
        /** 
         * 关闭原因
         * 这个字符串必须是不长于 123 字节的 UTF-8 文本
         */
        reason?: string;
    }

    interface SocketTask {
        /**
         * 发送消息
         * @param data 需要发送的消息
         */
        send(res: SocketSendOption): void

        /**
         * 关闭 WebSocket 连接
         * @param code 关闭代码
         * @param reason 关闭原因
         */
        close(res: SocketCloseOption): void

        /**
         * 监听 WebSocket 连接打开事件
         * @param listener 
         */
        onOpen(listener: (res: { header: IAnyObject, profile: SocketProfile }) => void): void

        /**
         * 监听 WebSocket 接收到消息事件
         * @param listener 
         * @param res.data 服务器返回的消息
         */
        onMessage(listener: (res: { data: string | ArrayBuffer }) => void): void

        /**
         * 监听 WebSocket 错误事件
         * @param listener 
         * @param res.errMsg 错误信息
         */
        onError(listener: (res: { errMsg: string }) => void): void

        /**
         * 监听 WebSocket 关闭事件
         * @param listener 
         * @param res.code 关闭代码
         * @param res.reason 关闭原因
         */
        onClose(listener: (res: { code: number, reason: string }) => void): void
    }

    interface Wx {
        connectSocket(option: ConnectSocketOption): SocketTask
        /** 上报启动场景值。需要基础库 2.26.2。 */
        reportScene?(option: ReportSceneOption): void;
        /** 上报自定义事件（事件分析）。data 的 value 只支持字符串和整数。 */
        reportEvent?(eventId: string, data?: { [key: string]: string | number }): void;
    }

    /** 来源信息。从另一个小程序、公众号或 App 进入小程序时返回。否则返回 `{}`。(参见后文注意) */
    interface EnterOptionsGameReferrerInfo {
        /** 来源小程序、公众号或 App 的 appId */
        appId: string
        /** 来源小程序传过来的数据，scene=1037或1038时支持 */
        extraData: IAnyObject
    }

    /** 启动参数 */
    interface LaunchOptionsApp {
        /** 需要基础库： `2.20.0`
         *
         * API 类别
         *
         * 可选值：
         * - 'default': 默认类别;
         * - 'nativeFunctionalized': 原生功能化，视频号直播商品、商品橱窗等场景打开的小程序;
         * - 'browseOnly': 仅浏览，朋友圈快照页等场景打开的小程序;
         * - 'embedded': 内嵌，通过打开半屏小程序能力打开的小程序; */
        apiCategory:
        | 'default'
        | 'nativeFunctionalized'
        | 'browseOnly'
        | 'embedded'
        /** 启动小程序的路径 (代码包路径) */
        path: string
        /** 启动小程序的 query 参数 */
        query: Record<string, string>
        /** 来源信息。从另一个小程序、公众号或 App 进入小程序时返回。否则返回 `{}`。(参见后文注意) */
        referrerInfo: EnterOptionsGameReferrerInfo
        /** 启动小程序的[场景值](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/scene.html) */
        scene: number
        /** 从微信群聊/单聊打开小程序时，chatType 表示具体微信群聊/单聊类型
         *
         * 可选值：
         * - 1: 微信联系人单聊;
         * - 2: 企业微信联系人单聊;
         * - 3: 普通微信群聊;
         * - 4: 企业微信互通群聊; */
        chatType?: 1 | 2 | 3 | 4
        /** shareTicket，详见[获取更多转发信息](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/share.html) */
        shareTicket?: string
    }

    /** 当前小程序运行的宿主环境 */
    interface AppBaseInfoHost {
        /** 宿主 app（第三方App） 对应的 appId （当小程序运行在第三方App环境时才返回） */
        appId: string
    }

    interface AppBaseInfo {
        /** 客户端基础库版本 */
        SDKVersion: string
        /** 是否已打开调试。可通过右上角菜单或 [wx.setEnableDebug](https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/wx.setEnableDebug.html) 打开调试。 */
        enableDebug: boolean
        /** 当前小程序运行的宿主环境 */
        host: AppBaseInfoHost
        /** 微信设置的语言 */
        language: string
        /** 微信版本号 */
        version: string
        /** 系统当前主题，取值为`light`或`dark`，全局配置`"darkmode":true`时才能获取，否则为 undefined （不支持小游戏）
         *
         * 可选值：
         * - 'dark': 深色主题;
         * - 'light': 浅色主题; */
        theme?: 'dark' | 'light'
    }

    interface SafeArea {
        /** 安全区域右下角纵坐标 */
        bottom: number
        /** 安全区域的高度，单位逻辑像素 */
        height: number
        /** 安全区域左上角横坐标 */
        left: number
        /** 安全区域右下角横坐标 */
        right: number
        /** 安全区域左上角纵坐标 */
        top: number
        /** 安全区域的宽度，单位逻辑像素 */
        width: number
    }

    interface WindowInfo {
        /** 设备像素比 */
        pixelRatio: number
        /** 在竖屏正方向下的安全区域。部分机型没有安全区域概念，也不会返回 safeArea 字段，开发者需自行兼容。 */
        safeArea: SafeArea
        /** 屏幕高度，单位px */
        screenHeight: number
        /** 窗口上边缘的y值 */
        screenTop: number
        /** 屏幕宽度，单位px */
        screenWidth: number
        /** 状态栏的高度，单位px */
        statusBarHeight: number
        /** 可使用窗口高度，单位px */
        windowHeight: number
        /** 可使用窗口宽度，单位px */
        windowWidth: number
    }

    /** 需要基础库： `2.12.3`
 *
 * 当前小程序运行的宿主环境 */
    interface SystemInfoHost {
        /** 宿主 app 对应的 appId */
        appId: string
    }

    interface SystemInfo {
        /** 需要基础库： `1.1.0`
         *
         * 客户端基础库版本 */
        SDKVersion: string
        /** 需要基础库： `2.6.0`
         *
         * 允许微信使用相册的开关（仅 iOS 有效） */
        albumAuthorized: boolean
        /** 需要基础库： `1.8.0`
         *
         * 设备性能等级（仅 Android）。取值为：-2 或 0（该设备无法运行小游戏），-1（性能未知），>=1（设备性能值，该值越高，设备性能越好）<br> 注意：性能等级当前仅反馈真机机型，暂不支持 IDE 模拟器机型 */
        benchmarkLevel: number
        /** 需要基础库： `2.6.0`
         *
         * 蓝牙的系统开关 */
        bluetoothEnabled: boolean
        /** 需要基础库： `1.5.0`
         *
         * 设备品牌 */
        brand: string
        /** 需要基础库： `2.6.0`
         *
         * 允许微信使用摄像头的开关 */
        cameraAuthorized: boolean
        /** 设备方向
         *
         * 可选值：
         * - 'portrait': 竖屏;
         * - 'landscape': 横屏; */
        deviceOrientation: 'portrait' | 'landscape'
        /** 需要基础库： `2.15.0`
         *
         * 是否已打开调试。可通过右上角菜单或 [wx.setEnableDebug](https://developers.weixin.qq.com/miniprogram/dev/api/base/debug/wx.setEnableDebug.html) 打开调试。 */
        enableDebug: boolean
        /** 需要基础库： `1.5.0`
         *
         * 用户字体大小（单位px）。以微信客户端「我-设置-通用-字体大小」中的设置为准 */
        fontSizeSetting: number
        /** 需要基础库： `2.12.3`
         *
         * 当前小程序运行的宿主环境 */
        host: SystemInfoHost
        /** 微信设置的语言 */
        language: string
        /** 需要基础库： `2.6.0`
         *
         * 允许微信使用定位的开关 */
        locationAuthorized: boolean
        /** 需要基础库： `2.6.0`
         *
         * 地理位置的系统开关 */
        locationEnabled: boolean
        /** `true` 表示模糊定位，`false` 表示精确定位，仅 iOS 支持 */
        locationReducedAccuracy: boolean
        /** 需要基础库： `2.6.0`
         *
         * 允许微信使用麦克风的开关 */
        microphoneAuthorized: boolean
        /** 设备型号。新机型刚推出一段时间会显示unknown，微信会尽快进行适配。 */
        model: string
        /** 需要基础库： `2.6.0`
         *
         * 允许微信通知带有提醒的开关（仅 iOS 有效） */
        notificationAlertAuthorized: boolean
        /** 需要基础库： `2.6.0`
         *
         * 允许微信通知的开关 */
        notificationAuthorized: boolean
        /** 需要基础库： `2.6.0`
         *
         * 允许微信通知带有标记的开关（仅 iOS 有效） */
        notificationBadgeAuthorized: boolean
        /** 需要基础库： `2.6.0`
         *
         * 允许微信通知带有声音的开关（仅 iOS 有效） */
        notificationSoundAuthorized: boolean
        /** 需要基础库： `2.19.3`
         *
         * 允许微信使用日历的开关 */
        phoneCalendarAuthorized: boolean
        /** 设备像素比 */
        pixelRatio: number
        /** 客户端平台
         *
         * 可选值：
         * - 'ios': iOS微信（包含 iPhone、iPad）;
         * - 'android': Android微信;
         * - 'windows': Windows微信;
         * - 'mac': macOS微信;
         * - 'devtools': 微信开发者工具; */
        platform: 'ios' | 'android' | 'windows' | 'mac' | 'devtools'
        /** 需要基础库： `2.7.0`
         *
         * 在竖屏正方向下的安全区域。部分机型没有安全区域概念，也不会返回 safeArea 字段，开发者需自行兼容。 */
        safeArea: SafeArea
        /** 需要基础库： `1.1.0`
         *
         * 屏幕高度，单位px */
        screenHeight: number
        /** 需要基础库： `1.1.0`
         *
         * 屏幕宽度，单位px */
        screenWidth: number
        /** 需要基础库： `1.9.0`
         *
         * 状态栏的高度，单位px */
        statusBarHeight: number
        /** 操作系统及版本 */
        system: string
        /** 微信版本号 */
        version: string
        /** 需要基础库： `2.6.0`
         *
         * Wi-Fi 的系统开关 */
        wifiEnabled: boolean
        /** 可使用窗口高度，单位px */
        windowHeight: number
        /** 可使用窗口宽度，单位px */
        windowWidth: number
        /** 需要基础库： `2.11.0`
         *
         * 系统当前主题，取值为`light`或`dark`，全局配置`"darkmode":true`时才能获取，否则为 undefined （不支持小游戏）
         *
         * 可选值：
         * - 'dark': 深色主题;
         * - 'light': 浅色主题; */
        theme?: 'dark' | 'light'
    }

    interface DeviceInfo {
        /** 应用（微信APP）二进制接口类型（仅 Android 支持） */
        abi: string
        /** 设备性能等级（仅 Android 支持）。取值为：-2 或 0（该设备无法运行小游戏），-1（性能未知），>=1（设备性能值，该值越高，设备性能越好，目前最高不到50） */
        benchmarkLevel: number
        /** 设备品牌 */
        brand: string
        /** 需要基础库： `2.29.0`
         *
         * 设备 CPU 型号（仅 Android 支持）（Tips: GPU 型号可通过 WebGLRenderingContext.getExtension('WEBGL_debug_renderer_info') 来获取） */
        cpuType: string
        /** 需要基础库： `2.25.1`
         *
         * 设备二进制接口类型（仅 Android 支持） */
        deviceAbi: string
        /** 需要基础库： `2.30.0`
         *
         * 设备内存大小，单位为 MB */
        memorySize: string
        /** 设备型号。新机型刚推出一段时间会显示unknown，微信会尽快进行适配。 */
        model: string
        /** 客户端平台 */
        platform: string
        /** 操作系统及版本 */
        system: string
    }

    /** 小程序账号信息 */
    interface MiniProgram {
        /** 小程序 appId */
        appId: string
        /** 需要基础库： `2.10.0`
         *
         * 小程序版本
         *
         * 可选值：
         * - 'develop': 开发版;
         * - 'trial': 体验版;
         * - 'release': 正式版; */
        envVersion: 'develop' | 'trial' | 'release'
        /** 需要基础库： `2.10.2`
         *
         * 线上小程序版本号 */
        version: string
    }

    /** 插件账号信息（仅在插件中调用时包含这一项） */
    interface Plugin {
        /** 插件 appId */
        appId: string
        /** 插件版本号 */
        version: string
    }

    /** 账号信息 */
    interface AccountInfo {
        /** 小程序账号信息 */
        miniProgram: MiniProgram
        /** 插件账号信息（仅在插件中调用时包含这一项） */
        plugin: Plugin
    }

    interface MidasPaymentOption {
        /** 支付的类型，不同的支付类型有各自额外要传的附加参数 */
        mode: "game",
        /** 是否为沙盒环境 0: 正式环境 1: 沙盒环境 */
        env?: 0 | 1,
        /** 商户号 在米大师侧申请的应用id */
        offerId: string,
        /** 货币类型 */
        currencyType: "CNY",
        /** 申请接入时的平台，platform 与应用id有关 */
        platform?: "android" | "windows",
        /** 购买数量。mode=game 时必填。购买数量 */
        buyQuantity: number,
        /** 分区ID 默认1 */
        zoneId?: string,
        /** 
         * 业务订单号，每个订单号只能使用一次，重复使用会失败。开发者需要确保该订单号在对应游戏下的唯一性，平台会尽可能校验该唯一性约束，但极端情况下可能会跳过对该约束的校验。要求32个字符内，只能是数字、大小写字母、符号_-|*组成，不能以下划线（)开头。建议每次调用wx.requestMidasPayment都换新的outTradeNo。若没有传入，则平台会自动填充一个，并以下划线开头
         */
        outTradeNo: string,
        /** 接口调用成功的回调函数 */
        success?: (res: { errMsg: string }) => void,
        /** 接口调用失败的回调函数 */
        fail?: (res: { errCode: number, errMsg: string, errno: number }) => void,
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: () => void;
    }

    interface RewardedVideoAdOnCloseListenerResult {
        /** 需要基础库： `2.1.0`
         *
         * 视频是否是在用户完整观看的情况下被关闭的 */
        isEnded: boolean
    }
    interface RewardedVideoAdOnErrorListenerResult {
        /** 需要基础库： `2.2.2`
         *
         * 错误码
         *
         * 可选值：
         * - 1000: 后端接口调用失败;
         * - 1001: 参数错误;
         * - 1002: 广告单元无效;
         * - 1003: 内部错误;
         * - 1004: 无合适的广告;
         * - 1005: 广告组件审核中;
         * - 1006: 广告组件被驳回;
         * - 1007: 广告组件被封禁;
         * - 1008: 广告单元已关闭; */
        errCode: 1000 | 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008
        /** 错误信息 */
        errMsg: string
    }

    /** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
    type RewardedVideoAdOffCloseCallback = (
        result: RewardedVideoAdOnCloseListenerResult
    ) => void
    /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
    type RewardedVideoAdOffErrorCallback = (
        result: RewardedVideoAdOnErrorListenerResult
    ) => void
    /** 用户点击 `关闭广告` 按钮的事件的监听函数 */
    type RewardedVideoAdOnCloseCallback = (
        result: RewardedVideoAdOnCloseListenerResult
    ) => void
    /** 激励视频错误事件的监听函数 */
    type RewardedVideoAdOnErrorCallback = (
        result: RewardedVideoAdOnErrorListenerResult
    ) => void
    /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
    type OffLoadCallback = (res: GeneralCallbackResult) => void
    type OnLoadCallback = (res: GeneralCallbackResult) => void

    interface RewardedVideoAd {
        /** 
         * [Promise RewardedVideoAd.load()](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.load.html)
         * 在插件中使用：不支持
         * 加载激励视频广告。 */
        load(): Promise<any>
        /** 
         * [Promise RewardedVideoAd.show()](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.show.html)
         * 在插件中使用：不支持
         * 显示激励视频广告。激励视频广告将从屏幕下方推入。 */
        show(): Promise<any>
        /** 
         * [RewardedVideoAd.destroy()](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.destroy.html)
         * 需要基础库： `2.8.0`
         * 在插件中使用：不支持
         * 销毁激励视频广告实例。 */
        destroy(): void
        /** 
         * [RewardedVideoAd.offClose(function listener)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.offClose.html)
         * 在插件中使用：不支持
         * 移除用户点击 `关闭广告` 按钮的事件的监听函数
         *
         * **示例代码**
         *
         * ```js
         * const listener = function (res) { console.log(res) }
         *
         * RewardedVideoAd.onClose(listener)
         * RewardedVideoAd.offClose(listener) // 需传入与监听时同一个的函数对象
         * ``` 
         */
        offClose(
            /** onClose 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: RewardedVideoAdOffCloseCallback
        ): void
        /** 
         * [RewardedVideoAd.offError(function listener)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.offError.html)
         * 在插件中使用：不支持
         * 移除激励视频错误事件的监听函数
         *
         * **示例代码**
         *
         * ```js
         * const listener = function (res) { console.log(res) }
         *
         * RewardedVideoAd.onError(listener)
         * RewardedVideoAd.offError(listener) // 需传入与监听时同一个的函数对象
         * ``` 
         */
        offError(
            /** onError 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: RewardedVideoAdOffErrorCallback
        ): void
        /** 
         * [RewardedVideoAd.offLoad(function listener)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.offLoad.html)
         * 在插件中使用：不支持
         * 移除激励视频广告加载事件的监听函数
         * **示例代码**
         * ```js
         * const listener = function (res) { console.log(res) }
         *
         * RewardedVideoAd.onLoad(listener)
         * RewardedVideoAd.offLoad(listener) // 需传入与监听时同一个的函数对象
         * ``` 
         */
        offLoad(
            /** onLoad 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: OffLoadCallback
        ): void
        /** 
         * [RewardedVideoAd.onClose(function listener)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.onClose.html)
         * 在插件中使用：不支持
         * 监听用户点击 `关闭广告` 按钮的事件。 */
        onClose(
            /** 用户点击 `关闭广告` 按钮的事件的监听函数 */
            listener: RewardedVideoAdOnCloseCallback
        ): void
        /** 
         * [RewardedVideoAd.onError(function listener)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.onError.html)
         * 在插件中使用：不支持
         * 监听激励视频错误事件。
         *
         * **错误码信息与解决方案表**
         *
         *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。
         *  在小程序发布上线之后，如果遇到异常问题，可以在[“运维中心“](https://mp.weixin.qq.com/)里面搜寻错误日志，还可以针对异常返回加上适当的监控信息。
         *
         * | 代码 | 异常情况 | 理由 | 解决方案 |
         * | ------ | -------------- | --------------- | -------------------------- |
         * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
         * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
         * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
         * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
         * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
         * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
         * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
         * | 1007  | 广告组件被封禁  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
         * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。| */
        onError(
            /** 激励视频错误事件的监听函数 */
            listener: RewardedVideoAdOnErrorCallback
        ): void
        /** 
         * [RewardedVideoAd.onLoad(function listener)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.onLoad.html)
         * 在插件中使用：不支持
         * 监听激励视频广告加载事件。 */
        onLoad(
            /** 激励视频广告加载事件的监听函数 */
            listener: OnLoadCallback
        ): void
    }

    interface CreateRewardedVideoAdOption {
        /** 广告单元 id */
        adUnitId: string
        /** 
         * 需要基础库： `2.8.0`
         * 是否启用多例模式，默认为false 
         */
        multiton?: boolean
    }

    interface InterstitialAdOnErrorCallbackResult {
        /** 错误码
         *
         * 可选值：
         * - 1000: 后端接口调用失败;
         * - 1001: 参数错误;
         * - 1002: 广告单元无效;
         * - 1003: 内部错误;
         * - 1004: 无合适的广告;
         * - 1005: 广告组件审核中;
         * - 1006: 广告组件被驳回;
         * - 1007: 广告组件被封禁;
         * - 1008: 广告单元已关闭; */
        errCode: 1000 | 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008
        /** 错误信息 */
        errMsg: string
    }

    type UDPSocketOffCloseCallback = (res: GeneralCallbackResult) => void

    /** 插屏错误事件的回调函数 */
    type InterstitialAdOffErrorCallback = (
        result: InterstitialAdOnErrorCallbackResult
    ) => void
    type UDPSocketOnCloseCallback = (res: GeneralCallbackResult) => void

    /** 插屏错误事件的回调函数 */
    type InterstitialAdOnErrorCallback = (
        result: InterstitialAdOnErrorCallbackResult
    ) => void

    interface CreateInterstitialAdOption {
        /** 广告单元 id */
        adUnitId: string
    }

    interface InterstitialAd {
        /** [InterstitialAd.destroy()](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.destroy.html)
         *
         * 销毁插屏广告实例。
         *
         * 最低基础库： `2.8.0` */
        destroy(): void
        /** [InterstitialAd.offClose(function callback)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.offClose.html)
         *
         * 取消监听插屏广告关闭事件 */
        offClose(
            /** 插屏广告关闭事件的回调函数 */
            callback?: UDPSocketOffCloseCallback
        ): void
        /** [InterstitialAd.offError(function callback)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.offError.html)
         *
         * 取消监听插屏错误事件 */
        offError(
            /** 插屏错误事件的回调函数 */
            callback?: InterstitialAdOffErrorCallback
        ): void
        /** [InterstitialAd.offLoad(function callback)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.offLoad.html)
         *
         * 取消监听插屏广告加载事件 */
        offLoad(
            /** 插屏广告加载事件的回调函数 */
            callback?: OffLoadCallback
        ): void
        /** [InterstitialAd.onClose(function callback)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.onClose.html)
         *
         * 监听插屏广告关闭事件。 */
        onClose(
            /** 插屏广告关闭事件的回调函数 */
            callback: UDPSocketOnCloseCallback
        ): void
        /** [InterstitialAd.onError(function callback)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.onError.html)
         *
         * 监听插屏错误事件。
         *
         * **错误码信息与解决方案表**
         *
         *
         *  错误码是通过onError获取到的错误信息。调试期间，可以通过异常返回来捕获信息。
         *  在小程序发布上线之后，如果遇到异常问题，可以在[“运维中心“](https://mp.weixin.qq.com/)里面搜寻错误日志，还可以针对异常返回加上适当的监控信息。
         *
         * | 代码 | 异常情况 | 理由 | 解决方案 |
         * | ------ | -------------- | --------------- | -------------------------- |
         * | 1000  | 后端错误调用失败  | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。 |
         * | 1001  | 参数错误    | 使用方法错误 | 可以前往developers.weixin.qq.com确认具体教程（小程序和小游戏分别有各自的教程，可以在顶部选项中，“设计”一栏的右侧进行切换。|
         * | 1002  | 广告单元无效    | 可能是拼写错误、或者误用了其他APP的广告ID | 请重新前往mp.weixin.qq.com确认广告位ID。 |
         * | 1003  | 内部错误    | 该项错误不是开发者的异常情况 | 一般情况下忽略一段时间即可恢复。|
         * | 1004  | 无适合的广告   | 广告不是每一次都会出现，这次没有出现可能是由于该用户不适合浏览广告 | 属于正常情况，且开发者需要针对这种情况做形态上的兼容。 |
         * | 1005  | 广告组件审核中  | 你的广告正在被审核，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
         * | 1006  | 广告组件被驳回  | 你的广告审核失败，无法展现广告 | 请前往mp.weixin.qq.com确认审核状态，且开发者需要针对这种情况做形态上的兼容。|
         * | 1007  | 广告组件被驳回  | 你的广告能力已经被封禁，封禁期间无法展现广告 | 请前往mp.weixin.qq.com确认小程序广告封禁状态。 |
         * | 1008  | 广告单元已关闭  | 该广告位的广告能力已经被关闭 | 请前往mp.weixin.qq.com重新打开对应广告位的展现。| */
        onError(
            /** 插屏错误事件的回调函数 */
            callback: InterstitialAdOnErrorCallback
        ): void
        /** [InterstitialAd.onLoad(function callback)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.onLoad.html)
         *
         * 监听插屏广告加载事件。 */
        onLoad(
            /** 插屏广告加载事件的回调函数 */
            callback: OnLoadCallback
        ): void
        /** [Promise InterstitialAd.load()](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.load.html)
         *
         * 加载插屏广告。
         *
         * 最低基础库： `2.8.0` */
        load(): Promise<any>
        /** [Promise InterstitialAd.show()](https://developers.weixin.qq.com/miniprogram/dev/api/ad/InterstitialAd.show.html)
         *
         * 显示插屏广告。
         *
         * **错误码信息表**
         *
         *
         *  如果插屏广告显示失败，InterstitialAd.show() 方法会返回一个rejected Promise，开发者可以获取到错误码及对应的错误信息。
         *
         * | 代码 | 异常情况 | 理由 |
         * | ------ | -------------- | -------------------------- |
         * | 2001  | 触发频率限制  | 小程序启动一定时间内不允许展示插屏广告 |
         * | 2002  | 触发频率限制  | 距离小程序插屏广告或者激励视频广告上次播放时间间隔不足，不允许展示插屏广告 |
         * | 2003  | 触发频率限制  | 当前正在播放激励视频广告或者插屏广告，不允许再次展示插屏广告 |
         * | 2004  | 广告渲染失败  | 该项错误不是开发者的异常情况，或因小程序页面切换导致广告渲染失败 |
         * | 2005  | 广告调用异常  | 插屏广告实例不允许跨页面调用 | */
        show(): Promise<any>
    }

    interface RequestSubscribeMessageFailCallbackResult {
        /** 接口调用失败错误码 */
        errCode: number
        /** 接口调用失败错误信息 */
        errMsg: string
    }
    interface RequestSubscribeMessageSuccessCallbackResult {
        /** [TEMPLATE_ID]是动态的键，即模板id，值包括'accept'、'reject'、'ban'、'filter'。'accept'表示用户同意订阅该条id对应的模板消息，'reject'表示用户拒绝订阅该条id对应的模板消息，'ban'表示已被后台封禁，'filter'表示该模板因为模板标题同名被后台过滤。例如 { errMsg: "requestSubscribeMessage:ok", zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: "accept"} 表示用户同意订阅zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE这条消息 */
        [TEMPLATE_ID: string]: string
        /** 接口调用成功时errMsg值为'requestSubscribeMessage:ok' */
        errMsg: string
    }
    interface RequestSubscribeSystemMessageSuccessCallbackResult {
        /** [MSG_TYPE]是动态的键，即系统订阅消息类型，值为'accept'、'reject'、'ban'，'accept'表示用户同意订阅该类型对应的模板消息，'reject'表示用户拒绝订阅该类型对应的模板消息，'ban'表示已被后台封禁。例如 { errMsg: "requestSubscribeSystemMessage:ok", SYS_MSG_TYPE_INTERACTIVE: "accept" } 表示用户同意订阅'SYS_MSG_TYPE_INTERACTIVE'这条消息 */
        MSG_TYPE: string
        /** 接口调用成功时errMsg值为'requestSubscribeSystemMessage:ok' */
        errMsg: string
    }
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type RequestSubscribeMessageCompleteCallback = (
        res: GeneralCallbackResult
    ) => void
    /** 接口调用失败的回调函数 */
    type RequestSubscribeMessageFailCallback = (
        result: RequestSubscribeMessageFailCallbackResult
    ) => void
    /** 接口调用成功的回调函数 */
    type RequestSubscribeMessageSuccessCallback = (
        result: RequestSubscribeMessageSuccessCallbackResult
    ) => void
    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type RequestSubscribeSystemMessageCompleteCallback = (
        res: GeneralCallbackResult
    ) => void
    /** 接口调用失败的回调函数 */
    type RequestSubscribeSystemMessageFailCallback = (
        result: RequestSubscribeMessageFailCallbackResult
    ) => void
    /** 接口调用成功的回调函数 */
    type RequestSubscribeSystemMessageSuccessCallback = (
        result: RequestSubscribeSystemMessageSuccessCallbackResult
    ) => void

    interface RequestSubscribeMessageOption {
        /** 需要订阅的消息模板的id的集合，一次调用最多可订阅3条消息（注意：iOS客户端7.0.6版本、Android客户端7.0.7版本之后的一次性订阅/长期订阅才支持多个模板消息，iOS客户端7.0.5版本、Android客户端7.0.6版本之前的一次订阅只支持一个模板消息）消息模板id在[微信公众平台(mp.weixin.qq.com)-功能-订阅消息]中配置。每个tmplId对应的模板标题需要不相同，否则会被过滤。 */
        tmplIds: any[]
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: RequestSubscribeMessageCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: RequestSubscribeMessageFailCallback
        /** 接口调用成功的回调函数 */
        success?: RequestSubscribeMessageSuccessCallback
    }
    interface RequestSubscribeSystemMessageOption {
        /** 系统订阅消息类型列表，一次调用最多可订阅3种类型的消息，目前支持："SYS_MSG_TYPE_INTERACTIVE"（好友互动提醒）、"SYS_MSG_TYPE_RANK"（排行榜超越提醒）、"SYS_MSG_TYPE_WHATS_NEW"（游戏更新提醒） */
        msgTypeList: string[]
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: RequestSubscribeSystemMessageCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: RequestSubscribeSystemMessageFailCallback
        /** 接口调用成功的回调函数 */
        success?: RequestSubscribeSystemMessageSuccessCallback
    }

    interface AsyncMethodOptionLike {
        success?: (...args: any[]) => void
    }
    type PromisifySuccessResult<
        P,
        T extends AsyncMethodOptionLike
    > = P extends {
        success: any
    }
        ? void
        : P extends { fail: any }
        ? void
        : P extends { complete: any }
        ? void
        : Promise<Parameters<Exclude<T['success'], undefined>>[0]>

    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type AuthorizeCompleteCallback = (res: GeneralCallbackResult) => void
    /** 接口调用失败的回调函数 */
    type AuthorizeFailCallback = (res: GeneralCallbackResult) => void
    /** 接口调用成功的回调函数 */
    type AuthorizeSuccessCallback = (res: GeneralCallbackResult) => void
    interface AuthorizeOption {
        /** 需要获取权限的 scope，详见 [scope 列表](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html#scope-列表) */
        scope: string
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: AuthorizeCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: AuthorizeFailCallback
        /** 接口调用成功的回调函数 */
        success?: AuthorizeSuccessCallback
    }

    interface ShareAppMessageOption {
        /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4 */
        imageUrl?: string
        /** 需要基础库： `2.4.3`
         *
         * 审核通过的图片编号，详见 [使用审核通过的转发图片](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#使用审核通过的转发图片) */
        imageUrlId?: string
        /** 需要基础库： `2.12.2`
         *
         * 独立分包路径。详见 [小游戏独立分包指南](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/independent-sub-packages.html) */
        path?: string
        /** 查询字符串，从这条转发消息进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。必须是 key1=val1&key2=val2 的格式。 */
        query?: string
        /** 转发标题，不传则默认使用当前小游戏的昵称。 */
        title?: string
        /** 需要基础库： `2.12.2`
         *
         * 是否转发到当前群。该参数只对从群工具栏打开的场景下生效，默认转发到当前群，填入false时可转发到其他会话。 */
        toCurrentGroup?: boolean
    }

    /** @warning **用户头像昵称获取规则已调整，参考 [用户信息接口调整说明](https://developers.weixin.qq.com/community/develop/doc/000cacfa20ce88df04cb468bc52801)、[小程序用户头像昵称获取规则调整公告](https://developers.weixin.qq.com/community/develop/doc/00022c683e8a80b29bed2142b56c01)**
 *
 * 用户信息 */
    interface UserInfo {
        /** 用户头像图片的 URL。URL 最后一个数值代表正方形头像大小（有 0、46、64、96、132 数值可选，0 代表 640x640 的正方形头像，46 表示 46x46 的正方形头像，剩余数值以此类推。默认132），用户没有头像时该项为空。若用户更换头像，原有头像 URL 将失效。 */
        avatarUrl: string
        /** 用户所在城市。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801) */
        city: string
        /** 用户所在国家。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801) */
        country: string
        /** 用户性别。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801)
         *
         * 可选值：
         * - 0: 未知;
         * - 1: 男性;
         * - 2: 女性; */
        gender: 0 | 1 | 2
        /** 显示 country，province，city 所用的语言。强制返回 “zh_CN”，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801)
         *
         * 可选值：
         * - 'en': 英文;
         * - 'zh_CN': 简体中文;
         * - 'zh_TW': 繁体中文; */
        language: 'en' | 'zh_CN' | 'zh_TW'
        /** 用户昵称 */
        nickName: string
        /** 用户所在省份。不再返回，参考 [相关公告](https://developers.weixin.qq.com/community/develop/doc/00028edbe3c58081e7cc834705b801) */
        province: string
    }

    interface GetUserInfoSuccessCallbackResult {
        /** 需要基础库： `2.7.0`
         *
         * 敏感数据对应的云 ID，开通[云开发](https://developers.weixin.qq.com/minigame/dev/wxcloud/basis/getting-started.html)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
        cloudID: string
        /** 包括敏感数据在内的完整用户信息的加密数据，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) */
        encryptedData: string
        /** 加密算法的初始向量，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法) */
        iv: string
        /** 不包括敏感信息的原始数据字符串，用于计算签名 */
        rawData: string
        /** 使用 sha1( rawData + sessionkey ) 得到字符串，用于校验用户信息，详见 [用户数据的签名验证和加解密](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
        signature: string
        /** [UserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfo.html)
         *
         * 用户信息对象，不包含 openid 等敏感信息 */
        userInfo: UserInfo
        errMsg: string
    }

    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type GetUserInfoCompleteCallback = (res: GeneralCallbackResult) => void
    /** 接口调用失败的回调函数 */
    type GetUserInfoFailCallback = (res: GeneralCallbackResult) => void
    /** 接口调用成功的回调函数 */
    type GetUserInfoSuccessCallback = (
        result: GetUserInfoSuccessCallbackResult
    ) => void

    interface GetUserInfoOption {
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: GetUserInfoCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: GetUserInfoFailCallback
        /** 显示用户信息的语言
         *
         * 可选值：
         * - 'en': 英文;
         * - 'zh_CN': 简体中文;
         * - 'zh_TW': 繁体中文; */
        lang?: 'en' | 'zh_CN' | 'zh_TW'
        /** 接口调用成功的回调函数 */
        success?: GetUserInfoSuccessCallback
        /** 是否带上登录态信息。当 withCredentials 为 true 时，要求此前有调用过 wx.login 且登录态尚未过期，此时返回的数据会包含 encryptedData, iv 等敏感信息；当 withCredentials 为 false 时，不要求有登录态，返回的数据不包含 encryptedData, iv 等敏感信息。 */
        withCredentials?: boolean
    }

    /** 订阅消息设置
*
* **示例代码**
*
* ```javascript
wx.getSetting({
withSubscriptions: true,
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
console.log(res.subscriptionsSetting)
// res.subscriptionsSetting = {
//   mainSwitch: true, // 订阅消息总开关
//   itemSettings: {   // 每一项开关
//     SYS_MSG_TYPE_INTERACTIVE: 'accept', // 小游戏系统订阅消息
//     SYS_MSG_TYPE_RANK: 'accept'
//     zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: 'reject', // 普通一次性订阅消息
//     ke_OZC_66gZxALLcsuI7ilCJSP2OJ2vWo2ooUPpkWrw: 'ban',
//   }
// }
}
})
``` */
    interface SubscriptionsSetting {
        /** 订阅消息总开关，true为开启，false为关闭 */
        mainSwitch: boolean
        /** 每一项订阅消息的订阅状态。itemSettings对象的键为**一次性订阅消息的模板id**或**系统订阅消息的类型**，值为'accept'、'reject'、'ban'中的其中一种。'accept'表示用户同意订阅这条消息，'reject'表示用户拒绝订阅这条消息，'ban'表示已被后台封禁。一次性订阅消息使用方法详见 [wx.requestSubscribeMessage](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)，永久订阅消息（仅小游戏可用）使用方法详见[wx.requestSubscribeSystemMessage](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeSystemMessage.html)
         * ## 注意事项
         *  - itemSettings 只返回用户勾选过订阅面板中的“总是保持以上选择，不再询问”的订阅消息。 */
        itemSettings?: IAnyObject
    }

    /** 用户授权设置信息，详情参考[权限](#) */
    interface AuthSetting {
        /** 是否授权使用你的微信朋友信息，对应开放数据域内的 [wx.getFriendCloudStorage](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getFriendCloudStorage.html) 、[wx.getGroupCloudStorage](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupCloudStorage.html) 、[wx.getGroupInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getGroupInfo.html) 、[wx.getPotentialFriendList](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getPotentialFriendList.html) 、[wx.getUserCloudStorageKeys](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserCloudStorageKeys.html) 、[wx.getUserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/OpenDataContext-wx.getUserInfo.html)  、[GameServerManager.getFriendsStateData](https://developers.weixin.qq.com/minigame/dev/api/game-server-manager/GameServerManager.getFriendsStateData.html) 接口，以及主域内的 [wx.getUserInteractiveStorage](https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getUserInteractiveStorage.html) 接口。 */
        'scope.WxFriendInteraction'?: boolean
        /** 是否授权录音功能，对应接口 [wx.getRecorderManager](https://developers.weixin.qq.com/minigame/dev/api/media/recorder/wx.getRecorderManager.html) */
        'scope.record'?: boolean
        /** 是否授权模糊地理位置，对应接口 [wx.getFuzzyLocation](https://developers.weixin.qq.com/minigame/dev/api/location/wx.getFuzzyLocation.html) */
        'scope.userFuzzyLocation'?: boolean
        /** 是否授权用户信息，对应接口 [wx.getUserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.getUserInfo.html) */
        'scope.userInfo'?: boolean
        /** 是否授权精确地理位置，对应接口 [wx.getLocation](https://developers.weixin.qq.com/minigame/dev/api/location/wx.getLocation.html)。将废弃，请使用 scope.userFuzzyLocation 代替 */
        'scope.userLocation'?: boolean
        /** 是否授权微信运动步数，对应接口 [wx.getWeRunData](https://developers.weixin.qq.com/minigame/dev/api/open-api/werun/wx.getWeRunData.html) */
        'scope.werun'?: boolean
        /** 是否授权保存到相册，对应接口 [wx.saveImageToPhotosAlbum](https://developers.weixin.qq.com/minigame/dev/api/media/image/wx.saveImageToPhotosAlbum.html) */
        'scope.writePhotosAlbum'?: boolean
    }
    interface GetSettingSuccessCallbackResult {
        /** [AuthSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/AuthSetting.html)
         *
         * 用户授权结果 */
        authSetting: AuthSetting
        /** [SubscriptionsSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/SubscriptionsSetting.html)
         *
         * 需要基础库： `2.10.1`
         *
         * 用户订阅消息设置，接口参数`withSubscriptions`值为`true`时才会返回。 */
        subscriptionsSetting: SubscriptionsSetting
        /** [AuthSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/AuthSetting.html)
         *
         * 在插件中调用时，当前宿主小程序的用户授权结果 */
        miniprogramAuthSetting?: AuthSetting
        errMsg: string
    }


    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type GetSettingCompleteCallback = (res: GeneralCallbackResult) => void
    /** 接口调用失败的回调函数 */
    type GetSettingFailCallback = (res: GeneralCallbackResult) => void
    /** 接口调用成功的回调函数 */
    type GetSettingSuccessCallback = (
        result: GetSettingSuccessCallbackResult
    ) => void

    interface GetSettingOption {
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: GetSettingCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: GetSettingFailCallback
        /** 接口调用成功的回调函数 */
        success?: GetSettingSuccessCallback
        /** 需要基础库： `2.10.1`
         *
         * 是否同时获取用户订阅消息的订阅状态，默认不获取。注意：withSubscriptions 只返回用户勾选过订阅面板中的“总是保持以上选择，不再询问”的订阅消息。 */
        withSubscriptions?: boolean
    }

    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type RequirePrivacyAuthorizeCompleteCallback = (
        res: GeneralCallbackResult
    ) => void
    /** 接口调用失败的回调函数 */
    type RequirePrivacyAuthorizeFailCallback = (
        res: GeneralCallbackResult
    ) => void
    /** 接口调用成功的回调函数 */
    type RequirePrivacyAuthorizeSuccessCallback = (
        res: GeneralCallbackResult
    ) => void

    interface RequirePrivacyAuthorizeOption {
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: RequirePrivacyAuthorizeCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: RequirePrivacyAuthorizeFailCallback
        /** 接口调用成功的回调函数 */
        success?: RequirePrivacyAuthorizeSuccessCallback
    }
    interface OnTapListenerResult {
        /** 需要基础库： `2.7.0`
         *
         * 敏感数据对应的云 ID，开通[云开发](../../wxcloud/basis/getting-started.md)的小程序才会返回，可通过云调用直接获取开放数据，详细见[云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#method-cloud) */
        cloudID: string
        /** 包括敏感数据在内的完整用户信息的加密数据，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
        encryptedData: string
        /** 调用结果（错误原因） */
        errMsg: string
        /** 加密算法的初始向量，详细见[加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
        iv: string
        /** 不包括敏感信息的原始数据字符串，用于计算签名 */
        rawData: string
        /** 使用 sha1( rawData + sessionkey ) 得到字符串，用于校验用户信息，参考文档[signature](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html) */
        signature: string
        /** [UserInfo](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfo.html)
         *
         * 用户信息对象，不包含 openid 等敏感信息 */
        userInfo: UserInfo
    }

    /** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
    type UserInfoButtonOffTapCallback = (result: OnTapListenerResult) => void
    /** 用户信息按钮的点击事件的监听函数 */
    type UserInfoButtonOnTapCallback = (result: OnTapListenerResult) => void

    /** 用户信息按钮 */
    interface UserInfoButton {
        /** 按钮的样式 */
        style: OptionStyle
        /** 按钮的类型。
         *
         * 可选值：
         * - 'text': 可以设置背景色和文本的按钮;
         * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
        type: 'text' | 'image'
        /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
        image?: string
        /** 按钮上的文本，仅当 type 为 `text` 时有效 */
        text?: string
        /** [UserInfoButton.destroy()](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.destroy.html)
         *
         * 销毁用户信息按钮 */
        destroy(): void
        /** [UserInfoButton.hide()](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.hide.html)
         *
         * 隐藏用户信息按钮。 */
        hide(): void
        /** [UserInfoButton.offTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.offTap.html)
*
* 移除用户信息按钮的点击事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

UserInfoButton.onTap(listener)
UserInfoButton.offTap(listener) // 需传入与监听时同一个的函数对象
``` */
        offTap(
            /** onTap 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: UserInfoButtonOffTapCallback
        ): void
        /** [UserInfoButton.onTap(function listener)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.onTap.html)
         *
         * 监听用户信息按钮的点击事件 */
        onTap(
            /** 用户信息按钮的点击事件的监听函数 */
            listener: UserInfoButtonOnTapCallback
        ): void
        /** [UserInfoButton.show()](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.show.html)
         *
         * 显示用户信息按钮 */
        show(): void
    }

    /** 按钮的样式 */
    interface OptionStyle {
        /** 背景颜色 */
        backgroundColor: string
        /** 高度 */
        height: number
        /** 左上角横坐标 */
        left: number
        /** 左上角纵坐标 */
        top: number
        /** 宽度 */
        width: number
        /** 边框颜色 */
        borderColor?: string
        /** 边框圆角 */
        borderRadius?: number
        /** 边框宽度 */
        borderWidth?: number
        /** 文本的颜色。格式为 6 位 16 进制数。 */
        color?: string
        /** 字号 */
        fontSize?: number
        /** 文本的行高 */
        lineHeight?: number
        /** 文本的水平居中方式
         *
         * 可选值：
         * - 'left': 居左;
         * - 'center': 居中;
         * - 'right': 居右; */
        textAlign?: 'left' | 'center' | 'right'
    }

    interface CreateUserInfoButtonOption {
        /** 按钮的样式 */
        style: OptionStyle
        /** 按钮的类型。
         *
         * 可选值：
         * - 'text': 可以设置背景色和文本的按钮;
         * - 'image': 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高; */
        type: 'text' | 'image'
        /** 按钮的背景图片，仅当 type 为 `image` 时有效 */
        image?: string
        /** 描述用户信息的语言
         *
         * 可选值：
         * - 'en': 英文;
         * - 'zh_CN': 简体中文;
         * - 'zh_TW': 繁体中文; */
        lang?: 'en' | 'zh_CN' | 'zh_TW'
        /** 是否带上登录态信息。当 withCredentials 为 true 时，要求此前有调用过 wx.login 且登录态尚未过期，此时返回的数据会包含 encryptedData, iv 等敏感信息；当 withCredentials 为 false 时，不要求有登录态，返回的数据不包含 encryptedData, iv 等敏感信息。 */
        withCredentials?: boolean
        /** 按钮上的文本，仅当 type 为 `text` 时有效 */
        text?: string
    }


    /** 当场景为由从另一个小程序或公众号或App打开时，返回此字段 */
    interface ResultReferrerInfo {
        /** 来源小程序或公众号或App的 appId */
        appId: string
        /** 来源小程序传过来的数据，scene=1037或1038时支持 */
        extraData: IAnyObject
    }

    /** 小游戏回到前台的事件的监听函数 */
    type OnShowCallback = (result: OnShowListenerResult) => void

    interface OnShowListenerResult {
        /** 查询参数 */
        query: Record<string, string>
        /** 当场景为由从另一个小程序或公众号或App打开时，返回此字段 */
        referrerInfo: ResultReferrerInfo
        /** 场景值 */
        scene: number
        /** 从微信群聊/单聊打开小程序时，chatType 表示具体微信群聊/单聊类型
         *
         * 可选值：
         * - 1: 微信联系人单聊;
         * - 2: 企业微信联系人单聊;
         * - 3: 普通微信群聊;
         * - 4: 企业微信互通群聊; */
        chatType?: 1 | 2 | 3 | 4
        /** shareTicket */
        shareTicket?: string
    }
    /** 在触控设备上的触摸点。通常是指手指或者触控笔在触屏设备或者触摸板上的操作。 */
    interface Touch {
        /** 触点相对于可见视区左边沿的 X 坐标。 */
        clientX: number
        /** 触点相对于可见视区上边沿的 Y 坐标。 */
        clientY: number
        /** 手指挤压触摸平面的压力大小, 从0.0(没有压力)到1.0(最大压力)的浮点数（仅在支持 force touch 的设备返回） */
        force: number
        /** Touch 对象的唯一标识符，只读属性。一次触摸动作(我们值的是手指的触摸)在平面上移动的整个过程中, 该标识符不变。可以根据它来判断跟踪的是否是同一次触摸过程。 */
        identifier: number
        /** 触点相对于页面左边沿的 X 坐标。 */
        pageX: number
        /** 触点相对于页面上边沿的 Y 坐标。 */
        pageY: number
    }

    interface OnTouchStartListenerResult {
        /** 触发此次事件的触摸点列表 */
        changedTouches: Touch[]
        /** 事件触发时的时间戳 */
        timeStamp: number
        /** 当前所有触摸点的列表 */
        touches: Touch[]
    }

    /** 触点失效事件的监听函数 */
    type OnTouchCancelCallback = (result: OnTouchStartListenerResult) => void
    /** 触摸结束事件的监听函数 */
    type OnTouchEndCallback = (result: OnTouchStartListenerResult) => void
    /** 触点移动事件的监听函数 */
    type OnTouchMoveCallback = (result: OnTouchStartListenerResult) => void
    /** 开始触摸事件的监听函数 */
    type OnTouchStartCallback = (result: OnTouchStartListenerResult) => void

    /** onTouchCancel 传入的监听函数。不传此参数则移除所有监听函数。 */
    type OffTouchCancelCallback = (result: OnTouchStartListenerResult) => void
    /** onTouchEnd 传入的监听函数。不传此参数则移除所有监听函数。 */
    type OffTouchEndCallback = (result: OnTouchStartListenerResult) => void
    /** onTouchMove 传入的监听函数。不传此参数则移除所有监听函数。 */
    type OffTouchMoveCallback = (result: OnTouchStartListenerResult) => void
    /** onTouchStart 传入的监听函数。不传此参数则移除所有监听函数。 */
    type OffTouchStartCallback = (result: OnTouchStartListenerResult) => void


    type OnHideCallback = (res: GeneralCallbackResult) => void

    interface LoginFailCallbackErr {
        /** 错误信息 */
        errMsg: string
        /** 需要基础库： `2.24.0`
         *
         * errno 错误码，错误码的详细说明参考 [Errno错误码](https://developers.weixin.qq.com/minigame/dev/guide/runtime/debug/PublicErrno.html) */
        errno: number
    }
    interface LoginSuccessCallbackResult {
        /** 用户登录凭证（有效期五分钟）。开发者需要在开发者服务器后台调用 [code2Session](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)，使用 code 换取 openid、unionid、session_key 等信息 */
        code: string
        errMsg: string
    }

    /** 接口调用结束的回调函数（调用成功、失败都会执行） */
    type LoginCompleteCallback = (res: GeneralCallbackResult) => void
    /** 接口调用失败的回调函数 */
    type LoginFailCallback = (err: LoginFailCallbackErr) => void
    /** 接口调用成功的回调函数 */
    type LoginSuccessCallback = (result: LoginSuccessCallbackResult) => void

    interface LoginOption {
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: LoginCompleteCallback
        /** 接口调用失败的回调函数 */
        fail?: LoginFailCallback
        /** 接口调用成功的回调函数 */
        success?: LoginSuccessCallback
        /** 需要基础库： `1.9.90`
         *
         * 超时时间，单位ms */
        timeout?: number
    }

    interface Wx {
        getLaunchOptionsSync(): LaunchOptionsApp;
        getEnterOptionsSync(): LaunchOptionsApp;
        getWindowInfo(): WindowInfo;
        getAppBaseInfo(): AppBaseInfo;
        getSystemInfoSync(): SystemInfo;
        getDeviceInfo(): DeviceInfo;
        getAccountInfoSync(): AccountInfo;
        exitMiniProgram(): void;
        setClipboardData(res: { data: string, fail: (res: GeneralCallbackResult) => void }): void;
        requestMidasPayment(res: MidasPaymentOption): void;
        /** 
         * [[RewardedVideoAd](https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.html) wx.createRewardedVideoAd(Object object)](https://developers.weixin.qq.com/miniprogram/dev/api/ad/wx.createRewardedVideoAd.html)
         * 需要基础库： `2.0.4`
         * 在插件中使用：需要基础库 `2.8.1`
         *
         * 创建激励视频广告组件。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号后再使用该 API（小游戏端要求 >= 2.0.4， 小程序端要求 >= 2.6.0）。调用该方法创建的激励视频广告是一个单例（小游戏端是全局单例，小程序端是页面内单例，在小程序端的单例对象不允许跨页面使用）。 
         */
        createRewardedVideoAd(option: CreateRewardedVideoAdOption): RewardedVideoAd,
        /** [wx.shareAppMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/share/wx.shareAppMessage.html)
        *
        * 主动拉起转发，进入选择通讯录界面。
        *
        * ****
        *
        * ## 注意事项
        * - 转发图片说明：imageUrl，imageUrlId 都存在时，优先使用 imageUrl。 imageUrl，imageUrlId 都不填时使用游戏画面截图。 */
        shareAppMessage(option: ShareAppMessageOption): void
        /** [wx.vibrateShort(Object object)](https://developers.weixin.qq.com/minigame/dev/api/device/vibrate/wx.vibrateShort.html)
         *
         * 需要基础库： `1.2.0`
         *
         * 使手机发生较短时间的振动（15 ms）。仅在 iPhone `7 / 7 Plus` 以上及 Android 机型生效 */
        vibrateShort(): void;
        /** [[InterstitialAd](https://developers.weixin.qq.com/minigame/dev/api/ad/InterstitialAd.html) wx.createInterstitialAd(Object object)](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createInterstitialAd.html)
         *
         * 需要基础库： `2.6.0`
         *
         * 创建插屏广告组件。请通过 [wx.getSystemInfoSync()](https://developers.weixin.qq.com/minigame/dev/api/base/system/wx.getSystemInfoSync.html) 返回对象的 SDKVersion 判断基础库版本号后再使用该 API。每次调用该方法创建插屏广告都会返回一个全新的实例（小程序端的插屏广告实例不允许跨页面使用）。 */
        createInterstitialAd(option: CreateInterstitialAdOption): InterstitialAd
        /** [wx.vibrateLong(Object object)](https://developers.weixin.qq.com/minigame/dev/api/device/vibrate/wx.vibrateLong.html)
        *
        * 需要基础库： `1.2.0`
        *
        * 使手机发生较长时间的振动（400 ms) */
        vibrateLong(): void;

        /** [wx.requestSubscribeMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)
*
* 需要基础库： `2.4.4`
*
* 调起客户端小游戏订阅消息界面，返回用户订阅消息的操作结果。当用户勾选了订阅面板中的“总是保持以上选择，不再询问”时，模板消息会被添加到用户的小游戏设置页，通过 [wx.getSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.getSetting.html) 接口可获取用户对相关模板消息的订阅状态。
*
* ## 注意事项
*  - 一次性模板 id 和永久模板 id 不可同时使用。
*  - 低版本基础库2.4.4~2.8.3 已支持订阅消息接口调用，仅支持传入一个一次性 tmplId / 永久 tmplId。
*  - [2.8.2](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 版本开始，用户发生点击行为或者发起支付回调后，才可以调起订阅消息界面。
*  - [2.10.0](https://developers.weixin.qq.com/miniprogram/dev/framework/compatibility.html) 版本开始，开发版和体验版小游戏将禁止使用模板消息 fomrId。
*  - 使用前建议阅读 [小游戏订阅消息使用指引](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/subscribe-message.html)。
*  - 一次授权调用里，每个tmplId对应的模板标题不能存在相同的，若出现相同的，只保留一个。
*
* **错误码**
*
* | errCode | errMsg                                                 | 说明                                                           |
* | ------- | ------------------------------------------------------ | -------------------------------------------------------------- |
* | 10001   | TmplIds can't be empty                                 | 参数传空了                                                     |
* | 10002   | Request list fail                                       | 网络问题，请求消息列表失败                                     |
* | 10003   | Request subscribe fail                                 | 网络问题，订阅请求发送失败                                     |
* | 10004   | Invalid template id                                    | 参数类型错误                                                   |
* | 10005   | Cannot show subscribe message UI                       | 无法展示 UI，一般是小游戏这个时候退后台了导致的                |
* | 20001   | No template data return, verify the template id exist  | 没有模板数据，一般是模板 ID 不存在 或者和模板类型不对应 导致的 |
* | 20002   | Templates type must be same                            | 模板消息类型 既有一次性的又有永久的                            |
* | 20003   | Templates count out of max bounds                      | 模板消息数量超过上限                                           |
* | 20004   | The main switch is switched off                        | 用户关闭了主开关，无法进行订阅                                 |
* | 20005   | This mini program was banned from subscribing messages | 小游戏被禁封                                                   |
*
* **示例代码**
*
* ```js
wx.requestSubscribeMessage({
tmplIds: [''],
success (res) {
console.log(res)
res === {
errMsg: "requestSubscribeMessage:ok",
"zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE": "accept"
}
}
})
``` */
        requestSubscribeMessage<
            T extends RequestSubscribeMessageOption = RequestSubscribeMessageOption
        >(
            option: T
        ): PromisifySuccessResult<T, RequestSubscribeMessageOption>

        /** [wx.requestSubscribeSystemMessage(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/subscribe-message/wx.requestSubscribeSystemMessage.html)
*
* 需要基础库： `2.9.4`
*
* 调起小游戏系统订阅消息界面，返回用户订阅消息的操作结果。当用户勾选了订阅面板中的“总是保持以上选择，不再询问”时，模板消息会被添加到用户的小游戏设置页，通过 [wx.getSetting](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.getSetting.html) 接口可获取用户对相关模板消息的订阅状态。
*
* ## 注意事项
*  - 使用前建议阅读 [小游戏系统订阅消息使用指引](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/subscribe-system-message.html)。
*  - 系统订阅消息只需要订阅一次，永久有效。
*
* **错误码**
*
* | errCode | errMsg                                                 | 说明                                                           |
* | ------- | ------------------------------------------------------ | -------------------------------------------------------------- |
* | 10001   | TmplIds can't be empty                                 | 参数传空了                                                     |
* | 10002   | Request list fail                                       | 网络问题，请求消息列表失败                                     |
* | 10003   | Request subscribe fail                                 | 网络问题，订阅请求发送失败                                     |
* | 10004   | Invalid template id                                    | 参数类型错误                                                   |
* | 10005   | Cannot show subscribe message UI                       | 无法展示 UI，一般是小游戏这个时候退后台了导致的                |
* | 20004   | The main switch is switched off                        | 用户关闭了主开关，无法进行订阅                                 |
* | 20005   | This mini program was banned from subscribing messages | 小游戏被禁封                                                   |
*
* **示例代码**
*
* ```js
wx.requestSubscribeSystemMessage({
msgTypeList: ['SYS_MSG_TYPE_INTERACTIVE', 'SYS_MSG_TYPE_RANK'],
success (res) {
console.log(res)
// res === {
//   errMsg: "requestSubscribeSystemMessage:ok",
//   SYS_MSG_TYPE_INTERACTIVE: "accept",
//   SYS_MSG_TYPE_RANK: 'reject'
// }
}
})
``` */
        requestSubscribeSystemMessage<
            T extends RequestSubscribeSystemMessageOption = RequestSubscribeSystemMessageOption
        >(
            option: T
        ): PromisifySuccessResult<T, RequestSubscribeSystemMessageOption>

        /** [wx.authorize(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/authorize/wx.authorize.html)
    *
    * 需要基础库： `1.2.0`
*
* 提前向用户发起授权请求。调用后会立刻弹窗询问用户是否同意授权小程序使用某项功能或获取用户的某些数据，但不会实际调用对应接口。如果用户之前已经同意授权，则不会出现弹窗，直接返回成功。更多用法详见 [用户授权](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html)。
*
* **注意事项**
*
* - 小游戏内使用 `wx.authorize({scope: "scope.userInfo"})`，不会弹出授权窗口，请使用 [wx.createUserInfoButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.createUserInfoButton.html)
* - 需要授权 `scope.userFuzzyLocation` 时必须[配置地理位置用途说明](https://developers.weixin.qq.com/minigame/dev/reference/configuration/app.html#permission)。
*
* **示例代码**
*
* ```js
// 可以通过 wx.getSetting 先查询一下用户是否授权了 "scope.writePhotosAlbum" 这个 scope
wx.getSetting({
success(res) {
if (!res.authSetting['scope.writePhotosAlbum']) {
wx.authorize({
scope: 'scope.writePhotosAlbum',
success () {
  // 用户已经同意保存到相册功能，后续调用 wx.saveImageToPhotosAlbum 接口不会弹窗询问
  wx.saveImageToPhotosAlbum()
}
})
}
}
})
``` */
        authorize<T extends AuthorizeOption = AuthorizeOption>(
            option: T
        ): PromisifySuccessResult<T, AuthorizeOption>

        /** [wx.getUserInfo(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.getUserInfo.html)
*
* 获取用户信息。详情参考 [用户信息获取](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/user-info.html)
*
* **示例代码**
*
* ```js
// 必须是在用户已经授权的情况下调用
wx.getUserInfo({
success: function(res) {
var userInfo = res.userInfo
var nickName = userInfo.nickName
var avatarUrl = userInfo.avatarUrl
var gender = userInfo.gender //性别 0：未知、1：男、2：女
var province = userInfo.province
var city = userInfo.city
var country = userInfo.country
}
})
```
*
* 敏感数据有两种获取方式：
* 1. 使用 [加密数据解密算法](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#加密数据解密算法)
* 2. 使用 [云调用直接获取开放数据](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/signature.html#云调用直接获取开放数据)
* 获取得到的开放数据为以下 json 结构：
*
* ```json
{
"openId": "OPENID",
"nickName": "NICKNAME",
"gender": GENDER,
"city": "CITY",
"province": "PROVINCE",
"country": "COUNTRY",
"avatarUrl": "AVATARURL",
"unionId": "UNIONID",
"watermark": {
"appid":"APPID",
"timestamp":TIMESTAMP
}
}
```
*
* **最佳用法**
*
* ```js
// 通过 wx.getSetting 查询用户是否已授权头像昵称信息
wx.getSetting({
success (res){
if (res.authSetting['scope.userInfo']) {
// 已经授权，可以直接调用 getUserInfo 获取头像昵称
wx.getUserInfo({
success: function(res) {
  console.log(res.userInfo)
}
})
} else {
// 否则，先通过 wx.createUserInfoButton 接口发起授权
let button = wx.createUserInfoButton({
type: 'text',
text: '获取用户信息',
style: {
  left: 10,
  top: 76,
  width: 200,
  height: 40,
  lineHeight: 40,
  backgroundColor: '#ff0000',
  color: '#ffffff',
  textAlign: 'center',
  fontSize: 16,
  borderRadius: 4
}
})
button.onTap((res) => {
// 用户同意授权后回调，通过回调可获取用户头像昵称信息
console.log(res)
})
}
}
})
``` */
        getUserInfo<T extends GetUserInfoOption = GetUserInfoOption>(
            option: T
        ): PromisifySuccessResult<T, GetUserInfoOption>

        /** [wx.getSetting(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/setting/wx.getSetting.html)
*
* 需要基础库： `1.2.0`
*
* 获取用户的当前设置。**返回值中只会出现小程序已经向用户请求过的[权限](https://developers.weixin.qq.com/minigame/dev/guide/base-ability/authorize.html)**。
*
* **示例代码**
*
* ```js
wx.getSetting({
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
}
})
```
*
* ```js
wx.getSetting({
withSubscriptions: true,
success (res) {
console.log(res.authSetting)
// res.authSetting = {
//   "scope.userInfo": true,
//   "scope.userLocation": true
// }
console.log(res.subscriptionsSetting)
// res.subscriptionsSetting = {
//   mainSwitch: true, // 订阅消息总开关
//   itemSettings: {   // 每一项开关
//     SYS_MSG_TYPE_INTERACTIVE: 'accept', // 小游戏系统订阅消息
//     SYS_MSG_TYPE_RANK: 'accept'
//     zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: 'reject', // 普通一次性订阅消息
//     ke_OZC_66gZxALLcsuI7ilCJSP2OJ2vWo2ooUPpkWrw: 'ban',
//   }
// }
}
})
``` */
        getSetting<T extends GetSettingOption = GetSettingOption>(
            option?: T
        ): PromisifySuccessResult<T, GetSettingOption>

        /** [wx.requirePrivacyAuthorize(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html)
*
* 需要基础库： `2.32.3`
*
* 模拟隐私接口调用，并触发隐私弹窗逻辑。隐私合规开发指南详情可见[《小游戏隐私合规开发指南》](https://developers.weixin.qq.com/community/develop/doc/000aa25cf1c8a0e64310ac3ef66401?highLine=%25E9%259A%2590%25E7%25A7%2581)
*
* ****
*
* ## 具体说明：
*
* 1. 调用 wx.requirePrivacyAuthorize() 时：
*   - 1. 如果用户之前已经同意过隐私授权，会立即返回success回调，不会触发 wx.onNeedPrivacyAuthorization 事件。
*   - 2. 如果用户之前没有授权过，并且开发者注册了 [wx.onNeedPrivacyAuthorization()](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.onNeedPrivacyAuthorization.html) 事件监听，就会立即触发 wx.onNeedPrivacyAuthorization 事件，然后开发者在 onNeedPrivacyAuthorization 回调中弹出自定义隐私授权弹窗，用户点了同意后开发者调用 wx.onNeedPrivacyAuthorization 的回调接口 resolve({ event: 'agree' })，会触发 requirePrivacyAuthorize 的 success 回调。用户点击拒绝授权后开发者调用 wx.onNeedPrivacyAuthorization 的回调接口 resolve({ event: 'disagree' }) 的话，会触发 requirePrivacyAuthorize 的 fail 回调。
*   - 3. 如果用户之前没有授权过，并且开发者没有注册 [wx.onNeedPrivacyAuthorization()](https://developers.weixin.qq.com/minigame/dev/api/open-api/privacy/wx.onNeedPrivacyAuthorization.html) 事件监听，就会立即弹出平台提供的统一隐私授权弹窗，用户点了同意之后，会触发 requirePrivacyAuthorize 的 success 回调，用户点了拒绝后会触发 requirePrivacyAuthorize 的 fail 回调。
*   - 4. 基于上述特性，开发者可以在调用任何真实隐私接口之前调用 wx.requirePrivacyAuthorize 接口来模拟隐私接口调用，并触发隐私弹窗（包括自定义弹窗或平台弹窗）逻辑。
*
* 2. 一定要调用 wx.requirePrivacyAuthorize 接口吗？
*   - 不是，wx.requirePrivacyAuthorize 只是一个辅助接口，可以根据实际情况选择使用。当开发者希望在调用隐私接口之前就主动弹出隐私弹窗时，就可以使用这个接口。
*
* **示例代码**
*
* ```js
wx.requirePrivacyAuthorize({
success: () => {
// 用户同意授权
// runGame() 继续游戏逻辑
},
fail: () => {}, // 用户拒绝授权
complete: () => {}
})
``` */
        requirePrivacyAuthorize(option: RequirePrivacyAuthorizeOption): void

        /** [[UserInfoButton](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/UserInfoButton.html) wx.createUserInfoButton(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/user-info/wx.createUserInfoButton.html)
 *
 * 需要基础库： `2.0.1`
 *
 * 创建用户信息按钮。使用前请参考 [用户信息获取](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/user-info.html) */
        createUserInfoButton(option: CreateUserInfoButtonOption): UserInfoButton
        /** [wx.onShow(function listener)](https://developers.weixin.qq.com/minigame/dev/api/base/app/life-cycle/wx.onShow.html)
 *
 * 监听小游戏回到前台的事件 */
        onShow(
            /** 小游戏回到前台的事件的监听函数 */
            listener: OnShowCallback
        ): void

        /** [CustomAd.onHide(function listener)](https://developers.weixin.qq.com/minigame/dev/api/ad/CustomAd.onHide.html)
 *
 * 需要基础库： `2.14.4`
 *
 * 监听原生模板广告隐藏事件, 某些模板如矩阵格子模板用户点击关闭时也会触发该事件。 */
        onHide(
            /** 原生模板广告隐藏事件的监听函数 */
            listener: OnHideCallback
        ): void

        /** [wx.onTouchCancel(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.onTouchCancel.html)
 *
 * 监听触点失效事件
 *
 * **注意**
 *
 * - 在 Windows/Mac 设备上，将会由鼠标事件转义而成。 */
        onTouchCancel(
            /** 触点失效事件的监听函数 */
            listener: OnTouchCancelCallback
        ): void
        /** [wx.onTouchEnd(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.onTouchEnd.html)
         *
         * 监听触摸结束事件
         *
         * **注意**
         *
         * - 在 Windows/Mac 设备上，将会由鼠标事件转义而成。 */
        onTouchEnd(
            /** 触摸结束事件的监听函数 */
            listener: OnTouchEndCallback
        ): void
        /** [wx.onTouchMove(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.onTouchMove.html)
         *
         * 监听触点移动事件
         *
         * **注意**
         *
         * - 在 Windows/Mac 设备上，将会由鼠标事件转义而成。
         * - 在 Windows/Mac 设备上并处于鼠标锁定状态时，touchMove 事件将会随着鼠标滑动持续触发。 */
        onTouchMove(
            /** 触点移动事件的监听函数 */
            listener: OnTouchMoveCallback
        ): void
        /** [wx.onTouchStart(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.onTouchStart.html)
         *
         * 监听开始触摸事件
         *
         * **注意**
         *
         * - 在 Windows/Mac 设备上，将会由鼠标事件转义而成。 */
        onTouchStart(
            /** 开始触摸事件的监听函数 */
            listener: OnTouchStartCallback
        ): void
        /** [wx.offTouchCancel(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.offTouchCancel.html)
*
* 移除触点失效事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onTouchCancel(listener)
wx.offTouchCancel(listener) // 需传入与监听时同一个的函数对象
``` */
        offTouchCancel(
            /** onTouchCancel 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: OffTouchCancelCallback
        ): void
        /** [wx.offTouchEnd(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.offTouchEnd.html)
*
* 移除触摸结束事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onTouchEnd(listener)
wx.offTouchEnd(listener) // 需传入与监听时同一个的函数对象
``` */
        offTouchEnd(
            /** onTouchEnd 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: OffTouchEndCallback
        ): void
        /** [wx.offTouchMove(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.offTouchMove.html)
*
* 移除触点移动事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onTouchMove(listener)
wx.offTouchMove(listener) // 需传入与监听时同一个的函数对象
``` */
        offTouchMove(
            /** onTouchMove 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: OffTouchMoveCallback
        ): void
        /** [wx.offTouchStart(function listener)](https://developers.weixin.qq.com/minigame/dev/api/device/touch-event/wx.offTouchStart.html)
*
* 移除开始触摸事件的监听函数
*
* **示例代码**
*
* ```js
const listener = function (res) { console.log(res) }

wx.onTouchStart(listener)
wx.offTouchStart(listener) // 需传入与监听时同一个的函数对象
``` */
        offTouchStart(
            /** onTouchStart 传入的监听函数。不传此参数则移除所有监听函数。 */
            listener?: OffTouchStartCallback
        ): void

        /** [wx.login(Object object)](https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html)
*
* 调用接口获取登录凭证（code）。通过凭证进而换取用户登录态信息，包括用户在当前小程序的唯一标识（openid）、微信开放平台账号下的唯一标识（unionid，若当前小程序已绑定到微信开放平台账号）及本次登录的会话密钥（session_key）等。用户数据的加解密通讯需要依赖会话密钥完成。
*
* **示例代码**
*
* ```js
wx.login({
  success (res) {
    if (res.code) {
      //发起网络请求
      wx.request({
        url: 'https://example.com/onLogin',
        data: {
          code: res.code
        }
      })
    } else {
      console.log('登录失败！' + res.errMsg)
    }
  }
})
``` */
        login<T extends LoginOption = LoginOption>(
            option?: T
        ): PromisifySuccessResult<T, LoginOption>

    }
}
declare const wx: WechatMiniprogram.Wx
