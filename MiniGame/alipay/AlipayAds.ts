/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 支付宝广告
 */

import { Log, Warn } from "../../Core";
import { BaseAds } from "../Base/BaseAds";
import { MiniErrorCode } from "../header";

export class AlipayAds extends BaseAds<AliyMiniprogram.RewardedAd, any> {

    public showAds(res: { success: () => void, fail: (errCode: number, errMsg: string) => void }): void {
        if (this._rewardAdUnitId === "" || !this._rewardAd) {
            Warn(MiniErrorCode.AD_NOT_INIT.msg);
            res.fail?.(MiniErrorCode.AD_NOT_INIT.code, MiniErrorCode.AD_NOT_INIT.msg);
            return;
        }
        if (this._rewardSuccess) {
            Warn(MiniErrorCode.AD_PLAYING.msg);
            res.fail?.(MiniErrorCode.AD_PLAYING.code, MiniErrorCode.AD_PLAYING.msg);
            return;
        }

        Log("显示广告", this._rewardAdUnitId);

        this._rewardSuccess = res.success;
        this._rewardFail = res.fail;

        this._rewardAd.show().then(() => {
            this._rewardListener?.onShow();
        }).catch(() => {
            this._rewardAd.load().then(() => {
                this._rewardAd.show().then(() => {
                    this._rewardListener?.onShow();
                }).catch((res) => {
                    this._rewardFail?.(res.errCode, res.errMsg);
                    this.reset();
                });
            }).catch((res) => {
                this._rewardFail?.(res.errCode, res.errMsg);
                this.reset();
            });
        });
    }

    protected createVideoAd(): AliyMiniprogram.RewardedAd {
        let videoAd = my.createRewardedAd({ adUnitId:this._rewardAdUnitId, multiton: false });
        /** 广告加载失败 */
        videoAd.onError((res: AliyMiniprogram.CallBack.Fail) => {
            Error(JSON.stringify(res));
            console.log("ali video load onError");
        });

        videoAd.onLoad(() => {
            Log("ali ads video onload success");
        });

        videoAd.onClose((res: { isEnded: boolean }) => {
            if ((res && res.isEnded) || res === undefined) {
                /** 广告播放完成 */
                this._rewardSuccess?.();

                this._rewardListener?.onClose();
            } else {
                /** 中途退出，不发放奖励 */
                this._rewardFail?.(MiniErrorCode.AD_EXIT.code, MiniErrorCode.AD_EXIT.msg);
            }
            this.reset();
        });
        return videoAd;
    }

}
