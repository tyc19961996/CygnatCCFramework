/** OPPO 小游戏通用能力适配。 */

import { Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, TouchData, VibrateShortType } from "../interface/IMiniCommon";

type OppoPlatform = "ios" | "android" | "ohos" | "windows" | "mac" | "devtools";

export class OppoCommon extends BaseCommon {
    private _launchOptions: Record<string, any> = {};
    private _systemInfo: OppoMinigame.SystemInfo = null;

    constructor() {
        super();
        this._launchOptions = qg.getLaunchOptionsSync?.() || {};
        this._hotLaunchOptions = this._launchOptions;

        qg.onShow?.((options) => {
            const nextOptions = options || {};
            this._notifyOnShow(nextOptions);
        });

        qg.onTouchStart?.((data) => this._notifyTouchStart(data as TouchData));
        qg.onTouchMove?.((data) => this._notifyTouchMove(data as TouchData));
        qg.onTouchEnd?.((data) => this._notifyTouchEnd(data as TouchData));
        qg.onTouchCancel?.((data) => this._notifyTouchCancel(data as TouchData));
    }

    public getLaunchOptions(): Record<string, any> {
        return this._launchOptions;
    }

    public getLibVersion(): string {
        return String(this.getSystemInfo()?.platformVersionCode ?? "0.0.1");
    }

    public getHostVersion(): string {
        return this.getSystemInfo()?.platformVersionName || "0.0.1";
    }

    public getPlatform(): OppoPlatform {
        return (this.getSystemInfo()?.platform || "devtools") as OppoPlatform;
    }

    public getScreenSize(): { width: number, height: number } {
        const systemInfo = this.getSystemInfo();
        return {
            width: systemInfo?.screenWidth || 0,
            height: systemInfo?.screenHeight || 0,
        };
    }

    public exitMiniProgram(): void {
        qg.exitApplication?.();
    }

    public setClipboardData(text: string): void {
        qg.setClipboardData?.({
            data: text,
            fail: (error) => Warn(`OPPO 设置剪贴板失败 ${this.getErrorMessage(error)}`),
        });
    }

    public vibrateShort(type: VibrateShortType = "medium"): void {
        qg.vibrateShort?.({ type });
    }

    public vibrateLong(): void {
        qg.vibrateLong?.();
    }

    public login(_force?: boolean): Promise<LoginResult> {
        return new Promise((resolve) => {
            if (!qg.login) {
                resolve({ success: false, code: "", errMsg: "当前 OPPO 小游戏环境不支持登录" });
                return;
            }

            qg.login({
                success: (result) => {
                    const data = result?.data || {};
                    resolve({
                        success: true,
                        code: data.code == null ? "" : String(data.code),
                        token: data.token,
                        uid: data.uid,
                        nickName: data.nickName,
                        avatar: data.avatar,
                    });
                },
                fail: (error) => {
                    resolve({
                        success: false,
                        code: "",
                        errCode: this.getErrorCode(error),
                        errMsg: this.getErrorMessage(error),
                    });
                },
            });
        });
    }

    private getSystemInfo(): OppoMinigame.SystemInfo {
        if (this._systemInfo) return this._systemInfo;
        this._systemInfo = qg.getSystemInfoSync?.() || {};
        return this._systemInfo;
    }

    private getErrorCode(error: OppoMinigame.ErrorResult): number | undefined {
        const code = error?.errCode ?? error?.code;
        if (code == null || code === "") return undefined;
        return Number(code);
    }

    private getErrorMessage(error: OppoMinigame.ErrorResult): string {
        return error?.errMsg || error?.msg || "未知错误";
    }
}
