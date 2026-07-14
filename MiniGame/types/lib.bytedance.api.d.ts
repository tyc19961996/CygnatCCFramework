/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 字节跳动 API 类型定义
 */

declare namespace BytedanceMiniprogram {
    type IAnyObject = Record<string, any>

    type GeneralSuccessCallback = (res: GeneralSuccessResult) => void;
    type GeneralFailCallback = (res: GeneralFailResult) => void;
    type GeneralCompleteCallback = (res: any) => void;

    interface GeneralSuccessResult {
        errMsg: string;
    }

    interface GeneralFailCodeResult {
        errCode: number;
        errMsg: string;
    }

    interface GeneralFailResult {
        errMsg: string;
        errNo?: number;
    }

    interface ShortcutStatus {
        /** 是否已经添加了桌面快捷方式 */
        exist: boolean;
        /** 是否需要更新快捷方式 */
        needUpdate?: boolean;
    }

    interface AddShortcutOption {
        success?: GeneralSuccessCallback;
        fail?: GeneralFailCallback;
        complete?: GeneralCompleteCallback;
    }

    interface CheckShortcutSuccessResult extends GeneralSuccessResult {
        status: ShortcutStatus;
    }

    interface CheckShortcutOption {
        success?: (res: CheckShortcutSuccessResult) => void;
        fail?: GeneralFailCallback;
        complete?: GeneralCompleteCallback;
    }

    interface ReportSceneSuccessResult extends GeneralSuccessResult {
        /** 开发者上报的原始数据 */
        data?: Record<string, unknown>;
    }

    interface ReportSceneOption {
        /** 场景 ID */
        sceneId: number;
        /** 场景耗时，单位 ms */
        costTime?: number;
        /** 自定义维度数据 */
        dimension?: Record<string, string>;
        /** 自定义指标数据 */
        metric?: Record<string, string>;
        success?: (res: ReportSceneSuccessResult) => void;
        fail?: GeneralFailCallback;
        complete?: GeneralCompleteCallback;
    }

    /** 获取版本信息和环境变量 */
    interface EnvInfo {
        /** 小程序信息 */
        microapp: {
            /** 小程序版本号 */
            mpVersion: string;
            /** 小程序环境 */
            envType: string;
            /** 小程序appId */
            appId: string;
        };
        /** 插件信息 */
        plugin: Record<string, unknown>;
        /** 通用参数 */
        common: {
            /** 用户数据存储的路径 */
            USER_DATA_PATH: string;
            /** 校验白名单属性中的appInfoLaunchFrom后返回额外信息 */
            location: string | undefined;
            launchFrom: string | undefined;
            schema: string | undefined;
        };
    }

    interface SystemInfo {
        /** 操作系统版本 */
        system: string;
        /** 操作系统类型 */
        platform: string;
        /** 手机品牌 */
        brand: string;
        /** 手机型号 */
        model: string;
        /** 宿主 App 版本号 */
        version: string;
        /**
         * 宿主 APP 名称
         *
         * - Toutiao 今日头条
         * - Douyin 抖音（国内版)
         * - news_article_lite 今日头条（极速版)
         * - live_stream 火山小视频
         * - XiGua 西瓜
         * - PPX 皮皮虾
         */
        appName: string;
        /** 客户端基础库版本 */
        SDKVersion: string;
        /** 屏幕宽度 */
        screenWidth: number;
        /** 屏幕高度 */
        screenHeight: number;
        /** 可使用窗口宽度 */
        windowWidth: number;
        /** 可使用窗口高度 */
        windowHeight: number;
        /** 设备像素比 */
        pixelRatio: number;
        /** 状态栏的高度，单位 px */
        statusBarHeight: number;
        /** 在竖屏正方向下的安全区域 */
        safeArea: {
            /** 安全区域左上角横坐标 */
            left: number;
            /** 安全区域右下角横坐标 */
            right: number;
            /** 安全区域左上角纵坐标 */
            top: number;
            /** 安全区域右下角纵坐标 */
            bottom: number;
            /** 安全区域的宽度，单位逻辑像素 */
            width: number;
            /** 安全区域的高度，单位逻辑像素 */
            height: number;
        };
    }


    interface LaunchParams {
        /**
         * 小程序启动页面路径
         * @version 1.12.0
         */
        path: string;
        /**
         * 小程序启动场景值
         * @version 1.12.0
         */
        scene: string;
        /**
         * 小程序启动参数
         * @version 1.12.0
         */
        query: object;
        /**
         * 来源信息。从另一个小程序进入小程序时返回。否则返回 {}。
         * @version 1.15.0
         */
        referrerInfo: {
            /** 来源小程序的 appId */
            appId: string;
            /** 来源小程序传过来的数据，场景值为 011009 或 011010 时支持。 */
            extraData: object;
        };
        /**
         * 唤起小程序页面的来源方式，10 表示用户点击小程序入口 schema，0 表示其它方式，比如前后台切换
         * @version 1.90.0
         */
        showFrom: number;
    }


    interface SocketTask {
        /**
         * 表示 Socket 连接状态 code
         * 若由于参数错误导致未创建连接, 则为 undefined
         */
        readonly readyState?: 0 | 1 | 2 | 3;
        /** 表示 Socket 正在连接的常量 */
        readonly CONNECTING: 0;
        /** 表示 Socket 连接已经打开的常量 */
        readonly OPEN: 1;
        /** 表示 Socket 连接关闭中的常量 */
        readonly CLOSING: 2;
        /** 表示 Socket 连接已关闭的常量 */
        readonly CLOSED: 3;

        /**
         * ### WebSocket 发送给服务端数据的方法
         */
        send: (res: {
            data: string | ArrayBuffer,
            success?: GeneralSuccessCallback,
            fail?: GeneralFailCallback,
            complete?: GeneralCompleteCallback
        }) => void;

        /** ### 关闭 WebSocket 连接的方法。 */
        close: (res: {
            code?: number,
            reason?: string,
            success?: GeneralSuccessCallback,
            fail?: GeneralFailCallback,
            complete?: GeneralCompleteCallback
        }) => void;

        /**
         * ### 监听 WebSocket 连接服务器成功的事件
         * 表示 WebSocket 的状态变成 open，可以发送数据给服务器。
         */
        onOpen: (
            callback: (res: {
                /** 连接服务器返回的 Response Header */
                header: Record<string, unknown>;
                /** 使用的网络传输层协议 */
                protocolType: string;
                /** websocket 类型 */
                socketType: "ttnet" | "tradition";
            }) => void
        ) => void;

        /** 监听 WebSocket 与服务器的连接断开的事件 */
        onClose: (
            callback: (res: {
                /** 使用的网络传输层协议 */
                protocolType: string;
                /** websocket 类型 */
                socketType: string;
                /** 错误信息 */
                errMsg: string;
                /** 关闭原因 */
                reason: string;
                /** 关闭 code */
                code: string;
            }) => void
        ) => void;

        /** ### 监听 WebSocket 接收到服务器发送信息的事件。 */
        onMessage: (
            callback: (res: {
                /** 接收到的服务器消息 */
                data: string | ArrayBuffer;
                /** websocket 使用的协议 */
                protocolType: string;
                /** websocket 类型 */
                socketType: "ttnet" | "tradition";
            }) => void
        ) => void;

        /** ### 监听 WebSocket 发生错误的事件 */
        onError: (
            callback: (res: {
                /** 错误信息 */
                errMsg: string;
            }) => void
        ) => void;
    }

    type OffCloseCallback = (input: {
        /** 用户是否完整观看了视频 */
        isEnded: boolean;
        /** 用户完整观看了几次视频 */
        count: number;
    }) => void;
    type OffErrorCallback = (input: {
        /** <p elementtiming="developer-element-timing"><span style="color: #1F2329;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">错误信息</span></span></p> */
        errMsg: string;
        /** <p elementtiming="developer-element-timing"><span style="color: #1F2329;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">错误码</span></span></p> */
        errCode: number;
    }) => void;
    type OffLoadCallback = () => void;
    type OnCloseCallback = (input: {
        /** 用户是否完整观看了视频 */
        isEnded: boolean;
        /** 用户完整观看了几次视频 */
        count: number;
    }) => void;
    type OnErrorCallback = (input: {
        /** 错误信息 */
        errMsg: string;
        /** 错误码 */
        errCode: number;
    }) => void;
    type OnLoadCallback = () => void;

    interface CreateRewardedVideoAdOption {
        /** <p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">是否开启再得广告模式（只支持安卓系统的抖音和抖音极速版）</span></span></p><p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><strong elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">功能说明：</span></strong></span><span style="color: #3C89FF;" elementtiming="developer-element-timing"><span style="background-color: #00000000;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/rewardagainintroduce" target="_blank" rel="nofollow" class="syl-link">激励再得能力</a></span></span></span></p> */
        multiton?: boolean;
        /** <p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">再得广告的奖励文案，玩家每看完一个广告都会展示，如【再看1个获得xx】</span></span></p><p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">xx 即 multitonRewardMsg 中的文案，按顺序依次展示，单个文案最大长度为 7</span></span></p><p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><strong elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">multiton 为 true 时必填</span></strong></span></p> */
        multitonRewardMsg?: string[];
        /** <p elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><strong elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">额外</span></strong><span style="font-size: 14px;" elementtiming="developer-element-timing">观看广告的次数，合法的数据范围为 1-4，</span><strong elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">multiton 为 true 时必填</span></strong></span></p> */
        multitonRewardTimes?: number;
        /** <p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">是否开启进度提醒，开启时广告文案为【再看N个获得xx】，关闭时为【 再看1个获得xx】。</span></span></p><p style="line-height: 1.38;margin: 0px 0px 0px;" elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">N 表示玩家当前还需额外观看广告的次数。</span></span></p> */
        progressTip?: boolean;
        /** <p elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">广告位 id，后续可以在平台基于广告位 id 看数</span></span></p> */
        adUnitId: string;
    }



    interface RewardedVideoAd {
        /** 通过 destroy 方法主动销毁广告实例。该方法返回一个 Promise，如果广告已经销毁成功，调用该方法返回一个 resolved Promise；如果是频繁的销毁重建，确保在收到 Promise 保证后再次创建新的。 */
        destroy: () => void;
        /** 通过 load 方法主动预加载广告内容。此外，在显示广告出现问题时也可以尝试主动 load 一次。 该方法返回一个 Promise，如果广告已经自动拉取成功，调用该方法返回一个 resolved Promise。 */
        load: () => Promise<any>;
        /** 解除绑定 close 事件的监听器。 */
        offClose: (
            /** <p elementtiming="developer-element-timing"><span style="color: #3C89FF;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/rewarded-video-ad/rewarded-video-ad-on-close" target="_blank" rel="nofollow" class="syl-link">close 事件</a></span></span><span style="color: #1F2329;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">监听器</span></span> */
            callback: OffCloseCallback,
        ) => void;
        /** 解除绑定 error 事件的监听器。 */
        offError: (
            /** <p elementtiming="developer-element-timing"><span style="color: #3C89FF;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/rewarded-video-ad/rewarded-video-ad-on-error" target="_blank" rel="nofollow" class="syl-link">error 事件</a></span></span><span style="color: #1F2329;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">的监听器</span></span></p> */
            callback: OffErrorCallback,
        ) => void;
        /** <p elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">解除</span></span><span style="color: #3C89FF;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/rewarded-video-ad/rewarded-video-ad-on-load" target="_blank" rel="nofollow" class="syl-link">绑定 load 事件</a></span></span><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">的监听器。</span></span></p> */
        offLoad: (
            /** <p elementtiming="developer-element-timing"><span style="color: #3C89FF;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/rewarded-video-ad/rewarded-video-ad-on-load" target="_blank" rel="nofollow" class="syl-link">load 事件</a></span></span><span style="color: #1F2329;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">监听器</span></span></p> */
            callback: OffLoadCallback,
        ) => void;
        /** 绑定 close 事件的监听器。 当用户点击了 Video 广告上的关闭按钮时，会触发 close 事件的监听器。 */
        onClose: (
            /** close 事件的监听器 */
            callback: OnCloseCallback,
        ) => void;
        /** 绑定 error 事件的监听器。 广告组件拉取广告素材和其他情况下如果发生错误，会触发 error 事件的监听器。 */
        onError: (
            /** error 事件的监听器 */
            callback: OnErrorCallback,
        ) => void;
        /** 绑定 load 事件的监听器。在手动调用 load 方法后，广告组件会预先加载，当广告组件成功拉取广告素材时会触发 load 事件。 */
        onLoad: (
            /** <p elementtiming="developer-element-timing">监听 load 事件的回调函数，回调参数是一个空对象</p> */
            callback: OnLoadCallback,
        ) => void;
        /** <p elementtiming="developer-element-timing"><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">广告创建后默认是隐藏的，可以通过该方法显示广告。 该方法返回一个 Promise 对象。当广告组件正常获取素材时，该 Promise 对象会是一个 resolved Promise。当广告组件发生错误时，会是一个 rejected Promise，参数与 </span></span><span style="color: #3C89FF;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/rewarded-video-ad/rewarded-video-ad-on-error" target="_blank" rel="nofollow" class="syl-link">error 事件监听器</a></span></span><span style="color: #171A1C;" elementtiming="developer-element-timing"><span style="font-size: 14px;" elementtiming="developer-element-timing">获得的参数相同。</span></span></p> */
        show: () => Promise<any>;
    }
    interface CreateRewardedVideoAdOption {
        /** 广告位 id */
        adUnitId: string;
        /** 是否开启再得广告模式（只支持安卓系统的抖音和抖音极速版） */
        multiton?: boolean;
        /** 
         * 再得广告的奖励文案，玩家每看完一个广告都会展示，如【再看1个获得xx】
         * xx 即 multitonRewardMsg 中的文案，按顺序依次展示，单个文案最大长度为 7
         * multiton 为 true 时必填
         */
        multitonRewardMsg?: string[];
        /** 
         * 额外观看广告的次数，合法的数据范围为 1-4，multiton 为 true 时必填
         */
        multitonRewardTimes?: number;
        /** 
         * 是否开启进度提醒，开启时广告文案为【再看N个获得xx】，关闭时为【 再看1个获得xx】。
         * N 表示玩家当前还需额外观看广告的次数
         */
        progressTip?: boolean;
    }

    interface IPaymentOptions {
        /** 支付的类型, 目前仅为"game" */
        mode: "game";
        /** 环境配置，目前合法值仅为"0" */
        env: 0;
        /** 货币类型，目前合法值仅为"CNY" */
        currencyType: "CNY";
        /** 申请接入时的平台，目前仅为"android" */
        platform: "android";
        /** 
         * 金币购买数量，金币数量必须满足：金币数量*金币单价 = 限定价格等级
         * goodType为游戏币场景时必传，其他场景不传 
         */
        buyQuantity?: number;

        /** 
         * 游戏服务区id，开发者自定义。游戏不分大区则默认填写"1"。如果应用支持多角色，则角色 ID 接在分区 ID 后，用"_"连接
         */
        zoneId?: string;
        /**
         * 游戏开发者自定义的唯一订单号，订单支付成功后通过服务端支付结果回调回传
         * 必须具有唯一性，如果不传或重复传相同值，则会报错
         */
        customId: string;
        /** 游戏开发者自定义的其他信息，订单支付成功后通过服务端支付结果回调回传。字符串长度最大不能超过 256。 */
        extraInfo?: string;
        /** 支付场景 默认:0 */
        goodType?: number;
        /** goodType为道具直购场景时必传，代表道具现金价格，单位为【分】，如道具价格为0.1元，则回传10 */
        orderAmount?: string;
        /** goodType为道具直购场景时，代表道具名称，长度限制小于等于10个字符，用于区分道具类型 */
        goodName?: string;

        success?: (res: GeneralSuccessResult) => void;
        fail?: (res: GeneralFailCodeResult) => void;
        complete?: (res: any) => void;
    }

    interface IAwemeCustomerOptions {
        /** 游戏开发者自定义的其他信息，订单支付成功后通过服务端支付结果回调回传。字符串长度最大不能超过 256。（强烈建议传入） */
        extraInfo?: string;
        /** 
         * 游戏服务区id，开发者自定义。游戏不分大区则默认填写"1"。如果应用支持多角色，则角色 ID 接在分区 ID 后，用"_"连接
         */
        zoneId?: string;

        /** 币种，目前仅为“DIAMOND” */
        currencyType: "DIAMOND" | "CNY";
        /** 
         * 金币购买数量，金币数量必须满足：金币数量*金币单价 = 限定价格等级
         * goodType为游戏币场景时必传，其他场景不传 
         */
        buyQuantity?: number;
        /** 支付场景 默认:0 */
        goodType?: number;
        /** goodType为道具直购场景时必传，代表道具现金价格，单位为【分】，如道具价格为0.1元，则回传10 */
        orderAmount?: string;
        /** goodType为道具直购场景时，代表道具名称，长度限制小于等于10个字符，用于区分道具类型 */
        goodName?: string;
        /**
         * 游戏开发者自定义的唯一订单号，订单支付成功后通过服务端支付结果回调回传
         * 必须具有唯一性，如果不传或重复传相同值，则会报错
         */
        customId: string;
        success?: (res: GeneralSuccessResult) => void;
        fail?: (res: GeneralFailResult) => void;
        complete?: (res: any) => void;
    }

    interface VibrateLongOption {
        /** 成功回调 */
        success?: (res: {
            /** "vibrateLong:ok" */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** "vibrateLong:fail " + 详细错误信息 */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    interface VibrateShortOption {
        /** 成功回调 */
        success?: (res: {
            /** "vibrateShort:ok" */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** "vibrateShort:fail " + 详细错误信息 */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }
    interface RequestSubscribeMessageOption {
        /** <p>需要订阅的消息模板的 id 的集合，最多支持传入三个 tmplId。</p><p>消息 id 获取请参考<a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/subscribe-message/introduce" target="_blank" rel="nofollow" class="syl-link">教程</a>中的【获取消息 ID】步骤</p> */
        tmplIds: string[];
        /** 成功回调 */
        success?: (res: {
            /** [TEMPLATE_ID]为模板 id */
            TEMPLATE_ID: string;
            /** "requestSubscribeMessage:ok" */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** "requestSubscribeMessage:fail" + 详细错误信息 */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    type OnShowCallback = (
        /** 回调参数 */
        GameShowParams: {
            /** 启动参数 */
            query: Object;
            /** <p>启动场景值。（查看方式：1. <a href="https://partner.open-douyin.com/docs/resource/zh-CN/mini-game/develop/framework/scene-value/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">抖音开放平台-场景值</a>；2.）抖音开发者工具中，普通编译 -&gt; 添加编译模式 -&gt; 进入场景）</p> */
            scene?: string;
            /** <p>-</p> */
            subScene?: string;
            /** <p>-</p> */
            shareTicket?: string;
            /** 来源信息，从另一个小程序进入小程序时返回，否则返回空对象 {} */
            refererInfo?: {
                /** 来源小程序 appId */
                appId?: string;
                /** 来源小程序传过来的数据 */
                extraData?: Object;
            };
            /** <p><span style="color: #1C1F23;"><span style="font-size: 14px;">唤起小游戏页面的来源方式</span></span></p> */
            showFrom: string;
            /** 启动场景字段 */
            launch_from?: string;
            /** 启动场景字段 */
            location?: string;
        },
    ) => void;

    type OnHideCallback = () => void;

    interface ShareAppMessageOption {
        /** <p>转发标题，不传则默认使用后台配置或当前小游戏的名称</p> */
        title?: string;
        /** <p>分享文案，不传则默认使用后台配置内容或游戏简介</p> */
        desc?: string;
        /** <p>附加信息（仅 channel == video | picture 时生效）</p> */
        extra?: {
            /** <p>channel = video 时可以设置。分享视频的标签，可以结合获取<a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/ability/-open/function-get-video-list" target="_blank" rel="nofollow" class="syl-link">抖音视频排行榜</a>使用</p> */
            videoTag?: string;
            /** <p>channel = video 时可以设置。是否支持跳转到播放页，以及支持获取视频信息等接口 （为 true 时会在 success 回调中带上 videoId）</p> */
            withVideoId?: boolean;
            /** <p>channel = video 时可以设置。视频地址 ，分享一个本地视频。如果 videoPath 不传入会拉起摄像头拍摄界面</p> */
            videoPath?: string;
            /** <p>channel = video 时可以设置。视频话题(<strong>仅抖音支持</strong>) ，目前由 hashtag_list 代替</p><p><strong>即将废弃</strong>，为保证兼容性，建议同时设置hashtag_list</p> */
            videoTopics?: string[];
            /** <p>channel = video | picture 时可以设置。视频话题，字符串中间包含空格会取第一个空格前内容作为话题(<strong>仅抖音支持</strong>)</p> */
            hashtag_list?: string[];
            /** <p>channel = video 时可以设置。抖音 pgc 音乐的短链(<strong>仅抖音支持，需要基础库版本大于 1.90</strong>) 。形如<a href="https://v.douyin.com/JmcxWo8/%EF%BC%8C" target="_blank" rel="nofollow" class="syl-link">https://v.douyin.com/JmcxWo8/</a><a href="https://v.douyin.com/JmcxWo8/%EF%BC%8C" target="_blank" rel="nofollow" class="syl-link">，</a> 参考 <a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/ability/gain-user/record-with-bgm" target="_blank" rel="nofollow" class="syl-link">抖音小游戏录屏带配乐能力</a></p> */
            defaultBgm?: string;
            /** <p>channel = video 时可以设置。抖音上可用的剪映模板 ID， 参考 <a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/operation1/ability/gain-user/capcut-with-game" target="_blank" rel="nofollow" class="syl-link">录屏添加剪映视频模板能力</a></p> */
            cutTemplateId?: string;
            /** <p><strong>channel = picture时，本参数必传</strong>。发布的图片地址，仅支持本地图片路径（即游戏包内路径和ttfile://路径）</p> */
            picturePath?: string[];
            /** <p>channel = picture 时可以设置。作品标题</p><div class="syl-image-wrapper" align="center"><span class="syl-image-fixer" style="display: inline-block;"><img src="https://sf1-cdn-tos.douyinstatic.com/obj/microapp/frontend/docs/images/output-203160501465242.66.png" name="" alt="" width="213" height="451"></span></div> */
            contentTitle?: string;
            /** <p>channel = picture 时可以设置。作品描述信息</p> */
            contentDescription?: string;
            /** <p>-</p> */
            ttgame_showcase_mgr_path?: string;
            /** <p>-</p> */
            ttgame_showcase_mgr_game_id?: string;
            /** <p>-</p> */
            useTeamInvitationStyle?: boolean;
            /** <p>-</p> */
            shareImagePath?: string;
            /** <p>channel = video 时可以设置。是否分享为挑战视频 ( 仅头条支持 )</p> */
            createChallenge: boolean;
            /** <p>channel = video 时可以设置。生成输入的默认文案</p> */
            video_title: string;
            /** <p><span style="color: #171A1C;"><span style="font-size: 14px;">channel = video 时可以设置。剪映模板不可用或者剪映模板 ID 无效的时候是否直接回调失败</span></span></p> */
            abortWhenCutTemplateUnavailable: boolean;
        };
        /** <p>转发内容类型</p> */
        channel?: string;
        /** <p>查询字符串，必须是 key1=val1&amp;key2=val2 的格式。从这条转发消息进入后，可通过 <a href="/docs/resource/zh-CN/mini-game/develop/api/system/lifecycle/tt-get-launch-options-sync/" target="_blank" rel="nofollow" class="syl-link">tt.getLaunchOptionsSync</a> 或 <a href="/docs/resource/zh-CN/mini-game/develop/api/system/lifecycle/tt-on-show/" target="_blank" rel="nofollow" class="syl-link">tt.onShow</a> 获取启动参数中的 query 用来实现信息透传</p> */
        query?: string;
        /** <p>分享素材模板 id，指定通过平台审核的 templateId 来选择分享内容，需在平台设置且通过审核。参考<a href="/docs/resource/zh-CN/mini-app/open-capacity/operation/douyin_task" target="_blank" rel="nofollow" class="syl-link">拍摄视频并发布至抖音</a></p> */
        templateId?: string;
        /** 成功回调 */
        success?: (res: {
            /** <p>仅当入参 options 中 channel='invite' 时返回，包含邀请对象的用户名和用户头像。(当邀请多个好友或群聊时，目前仅会返回一个好友的信息，群聊的信息暂不支持返回)</p> */
            data: { name: string; icon: string }[];
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** <p>"shareAppMessage:fail" + 错误信息</p> */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    interface NavigateToSceneOption {
        /** <p>需要确认的入口场景</p> */
        scene: string;
        /** 成功回调 */
        success?: (res: {
            /** "navigateToScene:ok" */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** "navigateToScene:fail" + 详细错误信息 */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    interface CheckSceneOption {
        /** 需要确认的入口场景 */
        scene: string;
        /** 成功回调 */
        success?: (res: {
            /** 入口场景是否存在 */
            isExist: boolean;
            /** "checkScene:ok" */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** "checkScene:fail" + 详细错误信息 */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    interface Touch {
        /** Touch 对象的唯一标识符，只读属性。一次触摸动作(指手指的触摸)在平面上移动的整个过程中, 该标识符不变。 可以根据它来判断跟踪的是否是同一次触摸过程 */
        identifier: number;
        /** 触点相对于屏幕左边沿的 X 坐标 */
        screenX: number;
        /** 触点相对于屏幕上边沿的 Y 坐标 */
        screenY: number;
    }

    type OnTouchStartCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    type OnTouchMoveCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    type OnTouchEndCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    type OnTouchCancelCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    type OffTouchStartCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    type OffTouchMoveCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;


    type OffTouchEndCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    type OffTouchCancelCallback = (
        /** callback回调接收参数对象 */
        TouchData: {
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。当前所有触摸点的列表</p> */
            touches: Touch[];
            /** <p><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/click-event/touch/" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">Touch</a>数组。触发此次事件的触摸点列表</p> */
            changedTouches: Touch[];
            /** 事件触发时的时间戳 */
            timeStamp: number;
        },
    ) => void;

    interface GetUserInfoOption {
        /** <p>是否需要返回敏感数据，如果是则在成功回调的参数中额外返回 `encryptedData`，`<span style="color: #171A1C;"><span style="font-size: 14px;">signature` 和 `iv` 字段</span></span></p> */
        withCredentials?: boolean;
        /** <p><span style="color: #171A1C;"><span style="font-size: 14px;">是否需要返回用户实名认证状态，如果是则在成功回调参数中额外返回 `realNameAuthenticationStatus` 字段</span></span></p> */
        withRealNameAuthenticationInfo?: boolean;
        /** 成功回调 */
        success?: (res: {
            /** <p>用户信息</p> */
            userInfo: {
                /** <p>用户头像</p> */
                avatarUrl: string;
                /** <p>用户名</p> */
                nickName: string;
                /** <p><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">用户性别，0: 未知；1:男性；2:女性。返回0，参考 </span></span><span style="color: #3C89FF;"><span style="font-size: 14px;" elementtiming="element-timing"><a href="https://developer.open-douyin.com/forum/mini-game/post/63354a56b1d3de363093289d" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">公告</a></span></span><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">。</span></span></p> */
                gender: number;
                /** <p><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">用户城市。 返回"", 参考 </span></span><span style="color: #3C89FF;"><span style="font-size: 14px;" elementtiming="element-timing"><a href="https://developer.open-douyin.com/forum/mini-game/post/63354a56b1d3de363093289d" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">公告</a></span></span><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">。</span></span></p> */
                city: string;
                /** <p><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">用户省份。&nbsp;返回"", 参考 </span></span><span style="color: #3C89FF;"><span style="font-size: 14px;" elementtiming="element-timing"><a href="https://developer.open-douyin.com/forum/mini-game/post/63354a56b1d3de363093289d" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">公告</a></span></span><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">。</span></span></p> */
                province: string;
                /** <p><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">用户国家。&nbsp;返回"", 参考 </span></span><span style="color: #3C89FF;"><span style="font-size: 14px;" elementtiming="element-timing"><a href="https://developer.open-douyin.com/forum/mini-game/post/63354a56b1d3de363093289d" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">公告</a></span></span><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">。</span></span></p> */
                country: string;
                /** <p><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">用户语言，目前为空。&nbsp;返回"", 参考 </span></span><span style="color: #3C89FF;"><span style="font-size: 14px;" elementtiming="element-timing"><a href="https://developer.open-douyin.com/forum/mini-game/post/63354a56b1d3de363093289d" target="_blank" rel="nofollow" class="syl-link" elementtiming="element-timing">公告</a></span></span><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">。</span></span></p> */
                language: string;
            };
            /** <p><span style="color: #171A1C;"><span style="font-size: 14px;" elementtiming="element-timing">userInfo 的 JSON 字符串形式</span></span></p> */
            rawData: string;
            /** <p><span style="color: #171A1C;"><span style="font-size: 14px;">用于校验用户信息是否被篡改，请参考</span></span><span style="color: #3C89FF;"><span style="font-size: 14px;"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/user-information/info/sensitive-data-process" target="_blank" rel="nofollow" class="syl-link">敏感数据处理</a></span></span><span style="color: #222222;"><span style="font-size: 14px;"> 。</span></span><span style="color: #171A1C;"><span style="font-size: 14px;">仅在 `withCredentials: true` 时返回</span></span></p> */
            signature: string;
            /** <p><span style="color: #171A1C;"><span style="font-size: 14px;">包括敏感信息（如 </span><span style="background-color: #F8F8F9;"><span style="font-size: 14px;">openId</span></span><span style="font-size: 14px;">）在内的已加密用户数据，如需解密数据请参考</span></span><span style="color: #3C89FF;"><span style="font-size: 14px;"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/user-information/info/sensitive-data-process" target="_blank" rel="nofollow" class="syl-link">敏感数据处理</a>。</span></span><span style="color: #222222;"><span style="font-size: 14px;">仅在 `withCredentials: true` 时返回</span></span></p> */
            encryptedData: string;
            /** <p><span style="color: #171A1C;"><span style="font-size: 14px;">加密算法参数，仅在 `withCredentials: true` 时返回</span></span></p> */
            iv: string;
            /** <p>实名认证情况，仅在 `withRealNameAuthenticationInfo: true` 时返回</p> */
            realNameAuthenticationStatus: number;
            /** "getUserInfo:ok" */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** "getUserInfo:fail" + 详细错误信息 */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    interface LoginOption {
        /** <p><span style="color: #1F2329;"><span style="font-size: 14px;" elementtiming="element-timing">未登录时, 是否强制调起登录框</span></span></p> */
        force?: boolean;
        /** 成功回调 */
        success?: (res: {
            /** <p><span style="color: #1F2329;"><span style="font-size: 14px;" elementtiming="element-timing">用于标识当前设备, 无论登录与否都会返回, 有效期 3 分钟。</span></span></p> */
            anonymousCode: string;
            /** <p><span style="color: #1F2329;"><span style="font-size: 14px;" elementtiming="element-timing">判断在当前 APP（头条、抖音等）是否处于登录状态。</span></span></p> */
            isLogin: boolean;
            /** <p><span style="color: #1F2329;"><span style="font-size: 14px;">临时登录凭证, 有效期 3 分钟。开发者可以通过在服务器端调用</span></span><span style="color: #3C89FF;"><span style="font-size: 14px;"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/server/log-in/code-2-session" target="_blank" rel="nofollow" class="syl-link">登录凭证校验接口</a></span></span><span style="color: #1F2329;"><span style="font-size: 14px;">换取 openid 和 session_key 等信息。</span></span></p> */
            code: string;
            /** <p>"login:ok"</p> */
            errMsg: string;
        }) => void;
        /** 失败回调 */
        fail?: (res: {
            /** <p>"login:fail " + 详细错误信息</p> */
            errMsg: string;
            /** 错误码，对应信息可参考错误码说明 */
            errNo?: number;
        }) => void;
        /** 完成回调 */
        complete?: (res: { errMsg: string }) => void;
    }

    interface InterstitialAd {
        /** 销毁插屏广告实例。 */
        destroy: () => void;
        /** 加载插屏广告。 */
        load: () => Promise<any>;
        /** 取消监听插屏广告关闭事件。 */
        offClose: (
            /** <p><span style="font-size: 14px;">通过 </span><span style="color: #3C89FF;"><span style="font-size: 14px;"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/interstitial-ad/interstitial-ad-on-close" target="_blank" rel="nofollow" class="syl-link">InterstitialAd.onClose</a> </span></span><span style="font-size: 14px;">绑定的监听器函数</span></p> */
            callback: OffCloseCallback,
        ) => void;
        /** 取消监听插屏错误事件。 */
        offError: (
            /** <p><span style="font-size: 14px;">通过 </span><span style="color: #3C89FF;"><span style="font-size: 14px;"><a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/interstitial-ad/interstitial-ad-on-error" target="_blank" rel="nofollow" class="syl-link">InterstitialAd.onError</a> </span></span><span style="font-size: 14px;">绑定的监听器函数</span></p> */
            callback: OffErrorCallback,
        ) => void;
        /** 取消监听插屏广告加载事件。 */
        offLoad: (
            /** <p>通过 <a href="https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/interstitial-ad/interstitial-ad-on-load" target="_blank" rel="nofollow" class="syl-link">InterstitialAd.onLoad</a> 绑定的监听器函数</p> */
            callback: OffLoadCallback,
        ) => void;
        /** 监听插屏广告关闭事件。 */
        onClose: (
            /** 监听器函数 */
            callback: OnCloseCallback,
        ) => void;
        /** 监听插屏错误事件。 */
        onError: (
            /** 监听器函数 */
            callback: OnErrorCallback,
        ) => void;
        /** 监听插屏广告加载事件。 */
        onLoad: (
            /** 监听器函数 */
            callback: OnLoadCallback,
        ) => void;
        /** 显示插屏广告。 */
        show: () =>  Promise<any>;
    }

    interface CreateInterstitialAdOption {
        /** <p><span style="color: #1F2329;"><span style="font-size: 14px;" elementtiming="element-timing">广告单元 id</span></span></p> */
        adUnitId: string;
    }


    interface TT {
        getEnvInfoSync(): EnvInfo;
        getSystemInfoSync(): SystemInfo;
        getLaunchOptionsSync(): LaunchParams;
        exitMiniProgram(res: {
            success?: GeneralSuccessCallback,
            fail?: GeneralFailCallback,
            complete?: GeneralCompleteCallback
        }): void;

        setClipboardData(res: {
            data: string,
            success?: GeneralSuccessCallback,
            fail?: GeneralFailCallback,
            complete?: GeneralCompleteCallback
        }): void;

        connectSocket(res: {
            /** Socket 连接地址 */
            url: string;
            /** 请求头 */
            header?: Record<string, string>;
            /** 子协议 */
            protocols?: string[];
            success?: (res: { socketTaskId: number }) => void,
            fail?: GeneralFailCallback,
            complete?: GeneralCompleteCallback
        }): SocketTask;

        /** <p elementtiming="developer-element-timing">开发者可以在小游戏中使用 Video 广告获得收入。Video 广告是由客户端原生渲染，覆盖在整个小游戏 Canvas 区域之上。观看广告时会暂停所有 JS 逻辑。Video 广告展示的时候用户不能操作小游戏。</p> */
        createRewardedVideoAd(option: CreateRewardedVideoAdOption): RewardedVideoAd;
        /** 支付 */
        requestGamePayment(res: IPaymentOptions): void;
        /** 发起抖音钻石支付 */
        openAwemeCustomerService(res: IAwemeCustomerOptions): void;

        /** 主动调用转发相关方法（拉起发布器、好友邀请、录屏分享等） */
        shareAppMessage: (input?: ShareAppMessageOption) => void;
        /** 使手机发生较短时间的振动。安卓震动时间为 30ms，ios 震动时间为 15ms。 */
        vibrateShort: (input?: VibrateShortOption) => void;
        /** 使手机发生较长时间的振动（400 ms)。 */
        vibrateLong: (input?: VibrateLongOption) => void;
        /** 调起客户端订阅消息界面，返回用户订阅消息的操作结果。当用户勾选了订阅面板中的 “总是保持以上选择，不再询问” 时，或是点击了订阅面板中 “拒绝，不再询问” 时，模板消息会被添加到用户的小程序设置页，用户可以在设置页面进行管理。 */
        requestSubscribeMessage: (input: RequestSubscribeMessageOption) => void;

        /** 监听小游戏回到前台的事件。 */
        onShow: (
            /** 小游戏回到前台的事件回调 */
            callback: OnShowCallback,
        ) => void;

        /** 监听小游戏隐藏到后台的事件。锁屏、按 HOME 键退到桌面等操作会触发此事件。 */
        onHide: (
            /** 小游戏隐藏到后台的事件回调。该回调函数没有参数。 */
            cb: OnHideCallback,
        ) => void;

        /** 调用该API可以跳转到某个小游戏入口场景，目前仅支持跳转「侧边栏」场景。 */
        navigateToScene: (input: NavigateToSceneOption) => void;

        /** 确认当前宿主版本是否支持跳转某个小游戏入口场景，目前仅支持「侧边栏」场景。 */
        checkScene: (input: CheckSceneOption) => void;
        /** 添加小游戏快捷方式到手机桌面。 */
        addShortcut?: (input: AddShortcutOption) => void;
        /** 检查小游戏快捷方式是否已添加到手机桌面。 */
        checkShortcut?: (input: CheckShortcutOption) => void;
        /** 上报启动场景值。 */
        reportScene?: (input: ReportSceneOption) => void;
        /** 监听开始触摸事件。 */
        onTouchStart: (
            /** 监听事件的回调函数 */
            callback: OnTouchStartCallback,
        ) => void;
        /** 监听触点移动事件。 */
        onTouchMove: (
            /** 监听事件的回调函数 */
            callback: OnTouchMoveCallback,
        ) => void;
        /** 监听触摸结束事件。 */
        onTouchEnd: (
            /** 监听事件的回调函数 */
            callback: OnTouchEndCallback,
        ) => void;
        /** 监听触点失效事件。 */
        onTouchCancel: (
            /** 监听事件的回调函数 */
            callback: OnTouchCancelCallback,
        ) => void;

        /** 取消监听触点失效事件。 */
        offTouchCancel: (
            /** 监听事件的回调函数 */
            callback?: OffTouchCancelCallback,
        ) => void;

        /** 取消监听触摸结束事件。 */
        offTouchEnd: (
            /** 取消监听事件的回调函数 */
            callback?: OffTouchEndCallback,
        ) => void;

        /** 取消监听触点移动事件。 */
        offTouchMove: (
            /** 监听事件的回调函数 */
            callback?: OffTouchMoveCallback,
        ) => void;

        /** 取消监听开始触摸事件。 */
        offTouchStart: (
            /** 监听事件的回调函数 */
            callback?: OffTouchStartCallback,
        ) => void;

        /** 获取已登录用户的基本信息或特殊信息，首次使用的用户会弹出授权提示窗，若用户同意，则会返回用户的真实数据。 */
        getUserInfo: (input?: GetUserInfoOption) => void;
        /** 调用该 API 可以获取用户临时的登录凭证。 */
        login: (input?: LoginOption) => void;
        /** 创建插屏广告，开发者可以在小游戏中使用插屏广告获得收入。插屏广告是由客户端原生渲染，由开发者控制广告组件的显示。该能力支持竖屏版和横屏版小游戏。 */
        createInterstitialAd: (
            input: CreateInterstitialAdOption,
        ) => InterstitialAd;
    }

}
declare const tt: BytedanceMiniprogram.TT
