import { MiniGame } from "../header";

// 保留旧版结构化适配器兼容性；内置工厂保证方法存在。
type LegacyCommon = Omit<MiniGame.IMiniCommon, "getSystemInfo">;
declare const legacyCommon: LegacyCommon;
const compatibleCommon: MiniGame.IMiniCommon = legacyCommon;
void compatibleCommon;

const common = MiniGame.MiniHelper.common();
const getSystemInfo: () => MiniGame.MiniSystemInfo | null = common.getSystemInfo;
const info: MiniGame.MiniSystemInfo | null = common.getSystemInfo();
if (info) {
    const width: number | undefined = info.screenWidth;
    const platform: string | undefined = info.platform;
    void width;
    void platform;
}
void getSystemInfo;

declare const wechat: MiniGame.WechatCommon;
declare const alipay: MiniGame.AlipayCommon;
declare const bilibili: MiniGame.BilibiliCommon;
declare const kuaishou: MiniGame.KuaiShouCommon;
declare const bytedance: MiniGame.BytedanceCommon;
declare const oppo: MiniGame.OppoCommon;
const wxInfo: WechatMiniprogram.SystemInfo | null = wechat.getSystemInfo();
const aliInfo: getSystemInfoSyncReturn | null = alipay.getSystemInfo();
const blInfo: BilibiliMiniprogram.SystemInfo | null = bilibili.getSystemInfo();
const ksInfo: KuaiShouMiniprogram.SystemInfo | null = kuaishou.getSystemInfo();
const ttInfo: BytedanceMiniprogram.SystemInfo | null = bytedance.getSystemInfo();
const qgInfo: OppoMinigame.SystemInfo = oppo.getSystemInfo();
const typedInfo: WechatMiniprogram.SystemInfo | null = MiniGame.MiniHelper.common<MiniGame.WechatCommon>().getSystemInfo();
void [wxInfo, aliInfo, blInfo, ksInfo, ttInfo, qgInfo, typedInfo];

// 不支持的平台可以返回 null；通用信息中的字段按平台能力选填。
const partialInfo: MiniGame.MiniSystemInfo = { platform: "android" };
// @ts-expect-error 屏幕宽度必须是数字
const invalidInfo: MiniGame.MiniSystemInfo = { screenWidth: "1080" };
void [partialInfo, invalidInfo];
