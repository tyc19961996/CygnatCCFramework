import { MiniGame } from "../header";

// 旧版 IMiniCommon 的结构化实现升级后仍应能赋给公共接口。
type LegacyCommon = Omit<MiniGame.IMiniCommon, "navigateToMiniProgram">;
declare const legacyCommon: LegacyCommon;
const compatibleCommon: MiniGame.IMiniCommon = legacyCommon;
void compatibleCommon;

async function checkNavigationContract(): Promise<void> {
    const options: MiniGame.NavigateToMiniProgramOptions = {
        appId: "target",
        path: "?from=game",
        extraData: { score: 7 },
        wechatEnvVersion: "trial",
        bilibiliVAppId: "target-v-app",
        bilibiliEnvVersion: "predev",
        bytedanceEnvVersion: "latest",
    };
    const success: boolean = await MiniGame.MiniHelper.common().navigateToMiniProgram(options);
    void success;

    const shortLinkOnly: MiniGame.NavigateToMiniProgramOptions = { shortLink: "https://wxaurl.cn/example" };
    const shortLinkSuccess: boolean = await MiniGame.MiniHelper.common().navigateToMiniProgram(shortLinkOnly);
    void shortLinkSuccess;

    // @ts-expect-error 必须提供 appId 或微信 shortLink
    const missingTarget: MiniGame.NavigateToMiniProgramOptions = {};
    void missingTarget;

    // @ts-expect-error 微信版本只能使用微信宿主支持的值
    const invalid: MiniGame.NavigateToMiniProgramOptions = { appId: "target", wechatEnvVersion: "latest" };
    void invalid;
}

void checkNavigationContract;
