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

async function login(config: MiniGame.Apk233AccountConfig): Promise<MiniGame.LoginResult> {
    const unsubscribe: () => void = MiniGame.Apk233Account.onAccountChanged((event: MiniGame.Apk233AccountChangedEvent) => {
        const generation: number = event.generation;
        const reason: "logout" | "changed" = event.reason;
        // @ts-expect-error 变更事件不暴露账号凭证。
        void event.sid;
        void generation;
        void reason;
    });
    try {
        await MiniGame.Apk233Account.init(config);
        const result = await MiniGame.MiniHelper.common().login();
        const credentials: [string?, string?] = [result.uid, result.sid];
        void credentials;
        return result;
    } finally {
        unsubscribe();
    }
}

void login;
void platform;
void isApk233;
