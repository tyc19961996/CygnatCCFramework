/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 微信小游戏工具类
 */

import { Core } from "../../../header";
import { Utils, Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, SubscribeResult, TouchData } from "../interface/IMiniCommon";

export class WechatCommon extends BaseCommon {
    private _launchOptions: WechatMiniprogram.LaunchOptionsApp = null;
    private _accountInfo: WechatMiniprogram.AccountInfo = null;

    /** 基础库 2.25.3 开始支持的信息 */
    private _appBaseInfo: WechatMiniprogram.AppBaseInfo = null;
    private _deviceInfo: WechatMiniprogram.DeviceInfo = null;
    private _windowInfo: WechatMiniprogram.WindowInfo = null;

    /** 从基础库 2.20.1 开始，本接口停止维护 */
    private _systemInfo: WechatMiniprogram.SystemInfo = null;

    /**
     * @internal
     */
    constructor() {
        super();
        // 获取冷启动参数
        this._launchOptions = wx.getLaunchOptionsSync();
        // 初始化热启动缓存
        this._hotLaunchOptions = this._launchOptions;
        // 监听 onShow 更新缓存
        wx.onShow?.((res: any) => {
            this._notifyOnShow(res);
        });
        // 监听触摸事件
        wx.onTouchStart?.((res) => { this._notifyTouchStart(this._convertTouchData(res)); });
        wx.onTouchMove?.((res) => { this._notifyTouchMove(this._convertTouchData(res)); });
        wx.onTouchEnd?.((res) => { this._notifyTouchEnd(this._convertTouchData(res)); });
        wx.onTouchCancel?.((res) => { this._notifyTouchCancel(this._convertTouchData(res)); });
        //打开分享菜单
        //@ts-ignore
        wx.showShareMenu?.();
    }

    /**
     * 获取冷启动参数
     */
    public getLaunchOptions(): WechatMiniprogram.LaunchOptionsApp {
        return this._launchOptions;
    }

    /**
     * 获取基础库版本号
     */
    public getLibVersion(): string {
        return this.getAppBaseInfo()?.SDKVersion || "0.0.1";
    }

    /**
     * 将微信触摸数据转换为统一的 TouchData 格式（clientX/clientY → screenX/screenY）
     */
    private _convertTouchData(res: WechatMiniprogram.OnTouchStartListenerResult): TouchData {
        const convertPoint = (t: WechatMiniprogram.Touch) => ({
            identifier: t.identifier,
            screenX: t.clientX,
            screenY: t.clientY,
        });
        return {
            touches: res.touches.map(convertPoint),
            changedTouches: res.changedTouches.map(convertPoint),
            timeStamp: res.timeStamp,
        };
    }

    /**
     * 宿主程序版本 (这里指微信版本)
     */
    public getHostVersion(): string {
        return this.getAppBaseInfo()?.version || "0.0.1";
    }

    /**
     * 获取运行平台
     */
    public getPlatform(): 'ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools' {
        return this.getDeviceInfo().platform as ('ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools');
    }

    /**
     * 获取版本类型
     */
    public getEnvType(): 'release' | 'debug' {
        return this.getVersionInfo().miniProgram.envVersion == "release" ? "release" : "debug";
    }

    /**
     * 退出小程序
     */
    public exitMiniProgram(): void {
        wx.exitMiniProgram?.();
    }

    public getScreenSize(): { width: number, height: number } {
        const windowInfo = this.getWindowInfo();
        return {
            width: windowInfo.screenWidth,
            height: windowInfo.screenHeight,
        };
    }

    /**
     * 复制到剪切板
     */
    public setClipboardData(text: string): void {
        wx.setClipboardData({
            data: text,
            fail: (res: WechatMiniprogram.GeneralCallbackResult) => {
                Warn("复制到剪切板失败", res.errMsg);
            }
        });
    }

    public vibrateShort(): void {
        wx.vibrateShort();
    }

    public vibrateLong(): void {
        wx.vibrateLong();
    }

    private getAppBaseInfo(): WechatMiniprogram.AppBaseInfo {
        if (this._appBaseInfo) {
            return this._appBaseInfo;
        }
        if (wx.getAppBaseInfo) {
            this._appBaseInfo = wx.getAppBaseInfo();
            return this._appBaseInfo;
        }
        const systemInfo = this.getSystemInfo();
        if (systemInfo) {
            this._appBaseInfo = {
                SDKVersion: systemInfo.SDKVersion,
                enableDebug: systemInfo.enableDebug,
                host: systemInfo.host,
                language: systemInfo.language,
                version: systemInfo.version,
                theme: systemInfo.theme,
            }
            return this._appBaseInfo;
        }
        Warn("getAppBaseInfo 失败");
        return null;
    }

    private getVersionInfo(): WechatMiniprogram.AccountInfo {
        if (this._accountInfo) {
            return this._accountInfo;
        }
        if (wx.getAccountInfoSync) {
            this._accountInfo = wx.getAccountInfoSync();
            return this._accountInfo;
        }
        Warn("getVersionInfo 失败");
        return {
            miniProgram: {
                envVersion: "release",
                appId: "unknown",
                version: "0.0.1",
            },
            plugin: {
                appId: "unknown",
                version: "0.0.1",
            },
        };
    }

    public getDeviceInfo(): WechatMiniprogram.DeviceInfo {
        if (this._deviceInfo) {
            return this._deviceInfo;
        }
        if (wx.getDeviceInfo) {
            this._deviceInfo = wx.getDeviceInfo();
            return this._deviceInfo;
        }
        const systemInfo = this.getSystemInfo();
        if (systemInfo) {
            this._deviceInfo = {
                abi: "unknown",
                benchmarkLevel: systemInfo.benchmarkLevel,
                brand: systemInfo.brand,
                cpuType: "unknown",
                deviceAbi: "unknown",
                memorySize: "unknown",
                model: systemInfo.model,
                platform: systemInfo.platform,
                system: systemInfo.system,
            }
            return this._deviceInfo;
        }
        Warn("getDeviceInfo 失败");
        return null;
    }

    public getWindowInfo(): WechatMiniprogram.WindowInfo {
        if (this._windowInfo) {
            return this._windowInfo;
        }
        if (wx.getWindowInfo) {
            this._windowInfo = wx.getWindowInfo();
            return this._windowInfo;
        }
        const systemInfo = this.getSystemInfo();
        if (systemInfo) {
            this._windowInfo = {
                pixelRatio: systemInfo.pixelRatio,
                safeArea: systemInfo.safeArea,
                screenHeight: systemInfo.screenHeight,
                screenTop: 0,
                screenWidth: systemInfo.screenWidth,
                statusBarHeight: systemInfo.statusBarHeight,
                windowHeight: systemInfo.windowHeight,
                windowWidth: systemInfo.windowWidth,
            }
        }
        Warn("getWindowInfo 失败");
        return null;
    }

    private getSystemInfo(): WechatMiniprogram.SystemInfo {
        if (this._systemInfo) {
            return this._systemInfo;
        }
        if (wx.getSystemInfoSync) {
            this._systemInfo = wx.getSystemInfoSync();
            return this._systemInfo;
        }
        Warn("getSystemInfo 失败");
        return null;
    }

    public shareAppMessage(options: { title?: string, desc?: string, imageUrl?: string, query?: string }, success: () => void, fail: (e) => void, complete: () => void): void {
        wx.shareAppMessage({
            title: options.title,
            imageUrl: options.imageUrl,
            query: options.query,
        });
        success && success();
        complete && complete();
    }

    public async authorize(scope: string): Promise<boolean> {

        if (!wx.authorize) return false;

        //判断是否已授权
        const isAuthorized = await this.isAuthorized(scope);

        if (isAuthorized) return true;

        return new Promise((resolve, reject) => {
            wx.authorize({
                scope: scope,
                success: (res) => {
                    Core.Log(`请求${scope}成功：${JSON.stringify(res)}`);
                    resolve(true);
                },
                fail: (res) => {
                    Core.Log(`请求${scope}失败：${JSON.stringify(res)}`);
                    resolve(false)
                }
            })
        })
    }

    /**
    * 是否已授权
    */
    public async isAuthorized(scope: string): Promise<boolean> {
        const setting = await this.getSetting();
        return setting.authSetting[scope] ?? false;
    }

    /**
     * 获取用户信息
     * @returns 用户信息
     */
    public async getUserInfo(): Promise<any> {

        if (!wx.getUserInfo) return null;

        //获取用户信息
        return new Promise((resolve, reject) => {
            wx.getUserInfo({
                withCredentials: false,
                lang: "zh_CN",
                success: (res) => {
                    resolve(res);
                },
                fail: (res) => {
                    resolve(null);
                }
            })
        })

    }


    /**
     *  获取设置
     * @param withSubscriptions 是否获取订阅消息权限
     * @returns 
     */
    public getSetting(withSubscriptions?: boolean): Promise<any> {
        if (!wx.getSetting) return null;
        return new Promise((resolve, reject) => {
            wx.getSetting({
                withSubscriptions,
                success: (res) => {
                    resolve(res);
                },
                fail: (res) => {
                    reject(new Error(`wx getSetting fail: ${res.errMsg}`));
                }
            })
        })
    }

    /**
    * 隐私协议授权
    * @returns 是否授权成功
    */
    public async requirePrivacyAuthorize(): Promise<boolean> {
        if (!wx.requirePrivacyAuthorize) return false;
        return new Promise((resolve, reject) => {
            wx.requirePrivacyAuthorize({
                success: () => {
                    resolve(true);
                },
                fail: (res) => {
                    resolve(false);
                }
            })
        })
    }

    /**
     * 创建用户信息按钮
     * @param options 
     */
    public async createUserInfoButton(options: any): Promise<any> {
        const { title, left = 0, top = 0, width = 0, height = 0 } = options;

        if (this._userInfoButton) {
            this._userInfoButton.destroy();
            this._userInfoButton = null;
        }

        return new Promise((resolve, reject) => {
            this._userInfoButton = wx.createUserInfoButton({
                withCredentials: true,
                type: 'text',
                text: title,
                style: {
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    backgroundColor: "#FF000000",
                    fontSize: 24,
                    lineHeight: 20,
                    color: "#00000000",
                    textAlign: "center",
                    borderRadius: 0
                }
            })

            //监听按钮点击
            this._userInfoButton.onTap((res) => {
                console.log(`用户信息按钮点击: ${JSON.stringify(res)}`);
                resolve(res);
                this.destroyUserInfoBtn();
            })

            console.log(`创建用户信息按钮成功:  left:${left}, top:${top}, width:${width}, height:${height}`);
        })
    }

    public async requestSubscribeMessage(tmplIds: string[]): Promise<SubscribeResult> {
        return new Promise((resolve) => {
            wx.requestSubscribeMessage({
                tmplIds: tmplIds,
                success: (res) => {
                    const data: Record<string, boolean> = {};
                    for (const id of tmplIds) {
                        data[id] = res[id] === 'accept';
                    }
                    resolve({ success: true, data });
                },
                fail: (res) => {
                    resolve({ success: false, data: {}, errCode: res.errCode, errMsg: res.errMsg });
                }
            });
        });
    }

    public async requestSubscribeSystemMessage(msgTypeList: string[]): Promise<SubscribeResult> {
        return new Promise((resolve) => {
            wx.requestSubscribeSystemMessage({
                msgTypeList: msgTypeList,
                success: (res) => {
                    const data: Record<string, boolean> = {};
                    for (const type of msgTypeList) {
                        data[type] = res[type] === 'accept';
                    }
                    resolve({ success: true, data });
                },
                fail: (res) => {
                    resolve({ success: false, data: {}, errCode: res.errCode, errMsg: res.errMsg });
                }
            });
        });
    }

    public canSubscribeMessage(): boolean {
        if (!wx.requestSubscribeMessage) return false;

        if (Utils.compareVersion(this.getLibVersion(), '2.4.4') < 0) return false;

        return true;
    }

    public canSubscribeSystemMessage(): boolean {

        if (!wx.requestSubscribeSystemMessage) return false;

        if (Utils.compareVersion(this.getLibVersion(), '2.9.4') < 0) return false;

        return true;
    }

    public async login(_force?: boolean): Promise<LoginResult> {
        return new Promise((resolve) => {
            wx.login({
                success: (res) => {
                    resolve({ success: true, code: res.code });
                },
                fail: (res) => {
                    resolve({ success: false, code: '', errCode: res.errno, errMsg: res.errMsg });
                }
            });
        });
    }

}