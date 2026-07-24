/**
 * @Description: 推荐流直玩（Feed 直出游戏）相关类型，仅抖音平台支持
 * 复访版接入指引: https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/feed/minigame-feedpush-setting-guide
 * 获客版接入指引: https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/open-ability/feed/customer-access-guide
 */

/** 推荐流直玩订阅场景 */
export enum FeedSubscribeScene {
    /** 离线收益场景 */
    OfflineReward = 1,
    /** 体力恢复场景 */
    EnergyRecover = 2,
    /** 重要事件掉落 */
    ImportantEvent = 3,
}

/** Feed 流进入/退出小游戏事件 */
export interface FeedStatusEvent {
    /** feedEnter: 从 Feed 流进入小游戏; feedExit: 退出小游戏回到 Feed 流 */
    type: "feedEnter" | "feedExit";
}

/** 推荐流直玩订阅参数（查询/发起共用） */
export interface IFeedSubscribeOptions {
    /** 是否全场景订阅（需基础库 3.45.0+；发起全场景订阅必须由用户点击触发，在 touchEnd 回调中同步调用） */
    allScene?: boolean;
    /** 订阅场景 ID（非全场景下必传） */
    scene?: FeedSubscribeScene;
    /** 自定义文案 contentID 数组（发起订阅且非全场景下必传，后台开通直玩能力后获取；查询时不需要） */
    contentIDs?: string[];
}

/** 直玩就绪条件运算符（storeFeedData 运算公式） */
export type FeedDataOperator = "=" | ">" | ">=" | "<" | "<=" | "!=";

/** 存储直玩就绪状态参数（面向无 server 小游戏；配置了 OpenAPI 的无需调用，基础库 3.67.0+） */
export interface IStoreFeedDataOptions {
    /** 订阅场景 ID */
    scene: FeedSubscribeScene;
    /** 满足运算公式后，对应直玩场景是否就绪：0 未就绪 1 就绪 */
    status: 0 | 1;
    /** 自定义文案 contentID（后台申请开通直玩能力后获取） */
    contentID: string;
    /** 运算符 */
    operator: FeedDataOperator;
    /** 运算公式右值（左值固定为毫秒级时间戳），如 "1744340968580" */
    rightValue: string;
    /** 运算公式左值，当前官方仅支持 "timeStampMs"，不传默认补齐 */
    leftValue?: "timeStampMs";
    /** 自定义补充字段 */
    extra?: string;
}

/** 直玩就绪状态数据（getFeedData 返回） */
export interface IFeedData {
    /** 当前直玩状态是否就绪：0 未就绪 1 就绪 */
    status: number;
    /** 存储时的自定义补充字段 */
    extra: string;
}

/** 推荐流直玩启动信息（启动 scene 尾号 3041 时存在） */
export interface IFeedLaunchInfo {
    /** 就绪场景: 0=获客 1=离线收益 2=体力恢复 3=重要事件 */
    scene: number;
    /** 用户渠道: 1=复访用户 2=获客用户 */
    channel: number;
    /** 本次启动对应的文案 contentID */
    contentId: string;
    /** 开发者自定义字段 feed_game_extra */
    extra: string;
}
