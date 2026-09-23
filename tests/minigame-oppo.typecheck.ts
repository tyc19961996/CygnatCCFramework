import { MiniHelper, MiniRewardAdPlacement, LoginResult } from "../MiniGame";

async function checkOppoLoginContract(): Promise<void> {
    const result: LoginResult = await MiniHelper.common().login();
    const token: string | undefined = result.token;
    const uid: string | undefined = result.uid;
    void token;
    void uid;
}

MiniHelper.ad().init({
    appId: "oppo-app-id",
    isDebug: true,
    defaultRewardAdId: "reward-id",
    interstitialAdId: "interstitial-id",
});

MiniHelper.ad().showRewardAd(
    { placement: MiniRewardAdPlacement.Default },
    { success: () => undefined, fail: () => undefined },
);

MiniHelper.ad().showInterstitialAd({ success: () => undefined, fail: () => undefined });

void checkOppoLoginContract;
