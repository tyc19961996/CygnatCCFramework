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
