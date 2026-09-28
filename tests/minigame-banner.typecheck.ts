import {
    IMiniBannerAds,
    IMiniBannerAdsListener,
    IMiniRewardAdInitConfig,
    IMiniShowBannerAdOptions,
    IMiniBannerAdOptions,
    IMiniRewardAds,
    MiniBannerAdCallback,
    MiniBannerAdSize,
    MiniHelper,
} from "../MiniGame";

const config: IMiniRewardAdInitConfig = {
    bannerAdId: "banner-id",
};

const options: IMiniShowBannerAdOptions = {
    adIntervals: 30,
    style: { left: 0, top: 640, width: 320, height: 100 },
};
const aliasOptions: IMiniBannerAdOptions = options;

const callback: MiniBannerAdCallback = {
    success: () => undefined,
    fail: (code: number, message: string) => `${code}:${message}`,
};

const listener: IMiniBannerAdsListener = {
    onShow: () => undefined,
    onClose: () => undefined,
    onResize: (size: MiniBannerAdSize) => size.width + size.height,
    onError: (code: number, message: string) => `${code}:${message}`,
};

const ads: IMiniRewardAds = MiniHelper.ad();
const bannerAds: IMiniBannerAds = ads;
ads.init(config);
ads.init("reward-id", "interstitial-id", "banner-id");
bannerAds.setBannerAdsListener(listener);
bannerAds.showBannerAd(options, callback);
bannerAds.hideBannerAd();
bannerAds.destroyBannerAd();
void aliasOptions;
