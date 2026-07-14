/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 支付宝小游戏工具类
 */

import { Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult } from "../interface/IMiniCommon";


export class AlipayCommon extends BaseCommon {
    private _launchOptions: AliyMiniprogram.AppLaunchOptions = null;

    private _systemInfo: getSystemInfoSyncReturn = null;
    private _accountInfo: AliyMiniprogram.AccountInfo = null;

    /**
     * @internal
     */
    constructor() {
        super();
        this._launchOptions = my.getLaunchOptionsSync();
    }

    public getLaunchOptions(): AliyMiniprogram.AppLaunchOptions {
        return this._launchOptions;
    }

    public getHotLaunchOptions(): Record<string, any> {
        return my.getEnterOptionsSync();
    }

    /** 
     * 获取基础库版本号
     */
    public getLibVersion(): string {
        return my.SDKVersion;
    }

    public login(_force?: boolean): Promise<LoginResult> {
        return new Promise((resolve) => {
            //@ts-ignore
            my.getAuthCode({
                scopes: 'auth_base',
                success: (res: any) => resolve({ success: true, code: res.authCode }),
                fail: (res: any) => resolve({ success: false, code: "", errCode: res.error, errMsg: res.errorMessage }),
            });
        })
    }

    /** 
     * 获取运行平台 合法值（ios | android | ohos | windows | mac | devtools）
     */
    public getPlatform(): any {
        let platform = this.getSystemInfo().platform;
        if (platform === 'iOS' || platform == 'iPhone OS') {
            return 'ios';
        } else if (platform.indexOf('iPad') > 0) {
            return 'iPad';
        }
        return platform as ('ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools' | 'iPad');
    }



    /**
     * 获取版本类型
     */
    public getEnvType(): 'release' | 'debug' {
        return this.getAccountInfo().miniProgram.envVersion == "release" ? "release" : "debug";
    }

    /** 
     * 宿主程序版本 (这里指支付宝 或其他宿主 版本)
     */
    public getHostVersion(): string {
        return this.getSystemInfo().version;
    }

    /**
     * 获取屏幕尺寸
     */
    public getScreenSize(): { width: number, height: number } {
        const systemInfo = this.getSystemInfo();
        return {
            width: systemInfo.windowWidth,
            height: systemInfo.windowHeight
        }
    }

    /** 
     * 退出当前小程序 (必须通过点击事件触发才能调用成功)
     */
    public exitMiniProgram(): void {
        my.exitProgram();
    }

    /**
     * 复制到剪切板
     */
    public setClipboardData(text: string): void {
        my.setClipboard({
            text: text,
            fail: (res: AliyMiniprogram.CallBack.Fail) => {
                Warn(`复制到剪切板失败 code:${res.error} msg:${res.errorMessage}`);
            }
        });
    }

    private getSystemInfo(): getSystemInfoSyncReturn {
        if (this._systemInfo) {
            return this._systemInfo;
        }
        if (my.getSystemInfoSync) {
            this._systemInfo = my.getSystemInfoSync();
            return this._systemInfo;
        }
        Warn("getSystemInfo 失败");
        return null;
    }

    private getAccountInfo(): AliyMiniprogram.AccountInfo {
        if (this._accountInfo) {
            return this._accountInfo;
        }
        if (my.getAccountInfoSync) {
            this._accountInfo = my.getAccountInfoSync();
            return this._accountInfo;
        }
        Warn("getAccountInfo 失败");
        return null;
    }

    public shareAppMessage(options: { title?: string, desc?: string, imageUrl?: string, query?: string }, success: () => void, fail: (e) => void, complete: () => void): void {
        success && success();
        complete && complete();
    }
}