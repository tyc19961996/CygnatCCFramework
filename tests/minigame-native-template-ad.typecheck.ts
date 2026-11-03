import { MiniGame } from "../header";

const ads = MiniGame.MiniHelper.ad();
const nativeAds: MiniGame.IMiniNativeTemplateAds = ads;
const style: MiniGame.MiniNativeTemplateAdStyle = { left: 0, top: 12, width: 328 };
const options: MiniGame.IMiniShowNativeTemplateAdOptions = { style };
const callback: MiniGame.MiniNativeTemplateAdCallback = { fail: (code: number, message: string) => {} };
const listener: MiniGame.IMiniNativeTemplateAdsListener = {
    onLoad: () => {}, onShow: () => {}, onHide: () => {},
    onClick: (event: MiniGame.MiniNativeTemplateAdClickEvent) => { const code: number | undefined = event.code; void code; },
    onError: (code: number, message: string) => {},
};
ads.init({ nativeTemplateAdId: "template-id" });
nativeAds.setNativeTemplateAdsListener(listener);
nativeAds.showNativeTemplateAd(options, callback);
nativeAds.hideNativeTemplateAd();
nativeAds.destroyNativeTemplateAd();
MiniGame.MiniHelper.ad<MiniGame.OppoAds>().showNativeTemplateAd();
// @ts-expect-error 模板高度由宿主按比例计算。
const invalidStyle: MiniGame.MiniNativeTemplateAdStyle = { height: 100 };
void invalidStyle;

// 旧适配器无需新增方法即可继续实现聚合接口。
const legacy: MiniGame.IMiniRewardAds = {
    init: () => {}, showAds: () => {}, showRewardAd: () => {}, showInterstitialAd: () => {},
    setRewardAdsListener: () => {}, setInterstitialAdsListener: () => {},
    showBannerAd: () => {}, hideBannerAd: () => {}, destroyBannerAd: () => {}, setBannerAdsListener: () => {},
};
void legacy;

const native: OppoMinigame.CustomAd | undefined = qg.createCustomAd?.({ adUnitId: "id", style });
native?.show().then(() => {});
native?.onClick((event) => { const code: number | undefined = event.code; void code; });
native?.offClick();
native?.offShow(null);
