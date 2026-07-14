/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 小游戏辅助类
 */

import { Platform } from "../Core";
import { AlipayAds } from "./alipay/AlipayAds";
import { AlipayCommon } from "./alipay/AlipayCommon";
import { AlipayPay } from "./alipay/AlipayPay";
import { BaseAds } from "./Base/BaseAds";
import { BaseCommon } from "./Base/BaseCommon";
import { BilibiliAds } from "./bilibili/BilibiliAds";
import { BilibiliCommon } from "./bilibili/BilibiliCommon";
import { BytedanceAds } from "./bytedance/BytedanceAds";
import { BytedanceCommon } from "./bytedance/BytedanceCommon";
import { BytedancePay } from "./bytedance/BytedancePay";
import { IMiniRewardAds } from "./interface/IMiniAds";
import { IMiniCommon } from "./interface/IMiniCommon";
import { IMiniPay } from "./interface/IMiniPay";
import { KuaiShouAds } from "./kuaishou/KuaiShouAds";
import { KuaiShouCommon } from "./kuaishou/KuaiShouCommon";
import { WechatAds } from "./wechat/WechatAds";
import { WechatCommon } from "./wechat/WechatCommon";
import { WechatPay } from "./wechat/WechatPay";

export class MiniHelper {
    /** 基础数据 */
    private static _common: IMiniCommon = null;
    /** 广告 */
    private static _ad: IMiniRewardAds = null;
    /** 支付 */
    private static _pay: IMiniPay = null;

    public static common<T extends IMiniCommon>(): T {
        if (!this._common) {
            if (Platform.isWX) {
                this._common = new WechatCommon();
            } else if (Platform.isBilibili) {
                this._common = new BilibiliCommon();
            } else if (Platform.isKuaiShou) {
                this._common = new KuaiShouCommon();
            } else if (Platform.isAlipay) {
                this._common = new AlipayCommon();
            } else if (Platform.isBytedance) {
                this._common = new BytedanceCommon();
            }else{
                this._common = new BaseCommon();
            }
        }
        return this._common as T;
    }

    public static ad<T extends IMiniRewardAds>(): T {
        if (!this._ad) {
            if (Platform.isWX) {
                this._ad = new WechatAds();
            } else if (Platform.isBilibili) {
                this._ad = new BilibiliAds();
            }else if (Platform.isKuaiShou) {
                this._ad = new KuaiShouAds();
            }  else if (Platform.isAlipay) {
                this._ad = new AlipayAds();
            } else if (Platform.isBytedance) {
                this._ad = new BytedanceAds();
            }else{
                this._ad = new BaseAds<any,any>();
            }
        }
        return this._ad as T;
    }

    public static pay<T extends IMiniPay>(): T {
        if (!this._pay) {
            if (Platform.isWX) {
                this._pay = new WechatPay();
            } else if (Platform.isAlipay) {
                this._pay = new AlipayPay();
            } else if (Platform.isBytedance) {
                this._pay = new BytedancePay();
            }
        }
        return this._pay as T;
    }
}
