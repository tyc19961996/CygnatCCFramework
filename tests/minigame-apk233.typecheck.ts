import { Core, MiniGame } from "../header";

const platform: Core.PlatformType = Core.PlatformType.Apk233;
const isApk233: boolean = Core.Platform.isApk233;
const ads = MiniGame.MiniHelper.ad();
ads.init({ appId: "app-key", defaultRewardAdId: "101", interstitialAdId: "102", bannerAdId: "103" });
ads.showRewardAd({ placement: MiniGame.MiniRewardAdPlacement.Default }, { success() {}, fail() {} });
ads.showInterstitialAd();
ads.showBannerAd();
ads.hideBannerAd();
ads.destroyBannerAd();
void platform;
void isApk233;
