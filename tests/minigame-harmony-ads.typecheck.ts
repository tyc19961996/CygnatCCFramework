import { Core, MiniGame } from "../header";

const platform: Core.PlatformType = Core.PlatformType.HarmonyOS;
const ads: MiniGame.IMiniRewardAds = new MiniGame.HarmonyAds();

ads.init({
    defaultRewardAdId: "reward-default",
    rewardAdIds: {
        [MiniGame.MiniRewardAdPlacement.Default]: "reward-default",
        [MiniGame.MiniRewardAdPlacement.AliBrowseTask]: "reward-browse",
    },
    interstitialAdId: "interstitial",
});

ads.setRewardAdsListener({
    onShow: () => undefined,
    onClose: () => undefined,
});

ads.showRewardAd(
    { placement: MiniGame.MiniRewardAdPlacement.Default },
    {
        success: () => undefined,
        fail: (code: number, message: string) => `${code}:${message}`,
    },
);

ads.showInterstitialAd({
    success: () => undefined,
    fail: (code: number, message: string) => `${code}:${message}`,
});

void platform;
