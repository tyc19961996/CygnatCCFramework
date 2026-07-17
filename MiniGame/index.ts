export { MiniHelper } from './MiniHelper';
export { MiniErrorCode, PriceLimitList } from './header';

/** 接口 */
export type {
    IMiniCommon,
    TouchPoint,
    TouchData,
    LoginResult,
    SubscribeResult,
    ReportSceneOptions,
} from './interface/IMiniCommon';
export type { IMiniPay, IMiniPayParams } from './interface/IMiniPay';
export { MiniRewardAdPlacement } from './interface/IMiniAds';
export type {
    IMiniRewardAds,
    IMiniRewardAdInitConfig,
    IMiniShowRewardAdOptions,
    IMiniAdsListener,
    MiniAdCallback,
} from './interface/IMiniAds';

/** 平台基类（未匹配到具体平台时的兜底实现，可继承扩展） */
export { BaseCommon } from './Base/BaseCommon';
export { BaseAds } from './Base/BaseAds';

/** 微信平台 */
export { WechatAds } from './wechat/WechatAds';
export { WechatCommon } from './wechat/WechatCommon';
export { WechatPay } from './wechat/WechatPay';

/** 支付宝平台 */
export { AlipayAds } from './alipay/AlipayAds';
export { AlipayCommon } from './alipay/AlipayCommon';
export { AlipayPay } from './alipay/AlipayPay';

/** Bilibili 平台 */
export { BilibiliAds } from './bilibili/BilibiliAds';
export { BilibiliCommon } from './bilibili/BilibiliCommon';

/** 快手平台 */
export { KuaiShouAds } from './kuaishou/KuaiShouAds';
export { KuaiShouCommon } from './kuaishou/KuaiShouCommon';

/** 字节跳动平台 */
export { BytedanceAds } from './bytedance/BytedanceAds';
export { BytedanceCommon } from './bytedance/BytedanceCommon';
export { BytedancePay } from './bytedance/BytedancePay';
