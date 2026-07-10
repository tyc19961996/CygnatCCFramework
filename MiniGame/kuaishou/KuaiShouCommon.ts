/**
 * @Author: Cygnat
 * @Date: 2026-06-23
 * @Description: 快手小游戏通用能力适配
 */

import { Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, SubscribeResult, TouchData } from "../interface/IMiniCommon";

type KuaiShouPlatform = 'ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools' | 'iPad';
type KuaiShouFailResult = KuaiShouMiniprogram.FailResult;

export class KuaiShouCommon extends BaseCommon {
    private _launchOptions: KuaiShouMiniprogram.LaunchOptions = null;
    private _systemInfo: KuaiShouMiniprogram.SystemInfo = null;

    /**
     * @internal
     */
    constructor() {
        super();
        this._launchOptions = ks.getLaunchOptionsSync();
        this._hotLaunchOptions = this._launchOptions;
        ks.onShow?.((res: KuaiShouMiniprogram.LaunchOptions) => {
            this._notifyOnShow(res);
        });
        ks.onTouchStart?.((res: KuaiShouMiniprogram.TouchEvent) => {
            this._notifyTouchStart(this.convertTouchData(res));
        });
        ks.onTouchMove?.((res: KuaiShouMiniprogram.TouchEvent) => {
            this._notifyTouchMove(this.convertTouchData(res));
        });
        ks.onTouchEnd?.((res: KuaiShouMiniprogram.TouchEvent) => {
            this._notifyTouchEnd(this.convertTouchData(res));
        });
        ks.onTouchCancel?.((res: KuaiShouMiniprogram.TouchEvent) => {
            this._notifyTouchCancel(this.convertTouchData(res));
        });
    }

    /**
     * 获取冷启动参数。
     */
    public getLaunchOptions(): KuaiShouMiniprogram.LaunchOptions {
        return this._launchOptions;
    }

    /**
     * 获取基础库版本号。小游戏文档未单独提供基础库版本，使用宿主版本兜底。
     */
    public getLibVersion(): string {
        const systemInfo = this.getSystemInfo();
        return systemInfo?.SDKVersion || systemInfo?.version || "0.0.1";
    }

    /**
     * 获取快手宿主版本号。
     */
    public getHostVersion(): string {
        return this.getSystemInfo()?.version || "0.0.1";
    }

    /**
     * 获取运行平台。
     */
    public getPlatform(): KuaiShouPlatform {
        return this.getSystemInfo()?.platform as KuaiShouPlatform;
    }

    /**
     * 快手小游戏当前文档未提供版本类型接口。
     */
    public getEnvType(): 'release' | 'debug' {
        return "release";
    }

    /**
     * 退出当前小游戏。快手要求该接口由用户点击行为触发。
     */
    public exitMiniProgram(): void {
        if (!ks.exitMiniProgram) return;
        ks.exitMiniProgram({
            fail: (res: KuaiShouFailResult) => {
                Warn(`退出快手小游戏失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /**
     * 获取屏幕尺寸。
     */
    public getScreenSize(): { width: number, height: number } {
        const systemInfo = this.getSystemInfo();
        return {
            width: systemInfo?.screenWidth || 0,
            height: systemInfo?.screenHeight || 0,
        };
    }

    /**
     * 快手小游戏文档未提供剪切板接口。
     */
    public setClipboardData(_text: string): void {

    }

    /**
     * 短震动，小游戏 API 需要传入震动强度。
     */
    public vibrateShort(): void {
        if (!ks.vibrateShort) return;
        ks.vibrateShort({
            type: "medium",
            fail: (res: KuaiShouFailResult) => {
                Warn(`快手短震动失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /**
     * 长震动。
     */
    public vibrateLong(): void {
        if (!ks.vibrateLong) return;
        ks.vibrateLong({
            fail: (res: KuaiShouFailResult) => {
                Warn(`快手长震动失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /**
     * 主动拉起快手转发。
     */
    public shareAppMessage(options: { title?: string, desc?: string, imageUrl?: string, query?: string }, success: () => void, fail: (e) => void, complete: () => void): void {
        if (!ks.shareAppMessage) {
            fail && fail({ msg: "快手小游戏当前环境不支持分享" });
            complete && complete();
            return;
        }
        ks.shareAppMessage({
            query: options.query,
            success: success,
            fail: fail,
            complete: complete,
        });
    }

    /**
     * 请求用户授权。
     */
    public async authorize(scope: string): Promise<boolean> {
        if (!ks.authorize) return false;

        const isAuthorized = await this.isAuthorized(scope);
        if (isAuthorized) return true;

        return new Promise((resolve) => {
            ks.authorize({
                scope: scope as KuaiShouMiniprogram.AuthorizationScope,
                success: () => {
                    resolve(true);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    /**
     * 查询指定 scope 是否已授权。
     */
    public async isAuthorized(scope: string): Promise<boolean> {
        const setting = await this.getSetting();
        return setting?.authSetting?.[scope] ?? false;
    }

    /**
     * 获取用户信息。
     */
    public async getUserInfo(): Promise<any> {
        if (!ks.getUserInfo) return null;
        return new Promise((resolve) => {
            ks.getUserInfo({
                success: (res: KuaiShouMiniprogram.GetUserInfoResult) => {
                    resolve(res);
                },
                fail: () => {
                    resolve(null);
                }
            });
        });
    }

    /**
     * 获取授权设置，并转为项目通用的 authSetting 结构。
     */
    public async getSetting(_withSubscriptions?: boolean): Promise<any> {
        if (!ks.getSetting) return null;
        return new Promise((resolve, reject) => {
            ks.getSetting({
                success: (res: KuaiShouMiniprogram.GetSettingResult) => {
                    const authSetting = res.result || res;
                    resolve({ authSetting });
                },
                fail: (res: KuaiShouFailResult) => {
                    reject(new Error(`ks getSetting fail: ${this.getErrorMessage(res)}`));
                }
            });
        });
    }

    /**
     * 当前快手小游戏没有微信式悬浮用户信息按钮，返回 null。
     */
    public async createUserInfoButton(_options: any): Promise<any> {
        return null;
    }

    /**
     * 快手当前没有项目通用隐私弹窗接口，默认按无需额外授权处理。
     */
    public async requirePrivacyAuthorize(): Promise<boolean> {
        return true;
    }

    /**
     * 快手小游戏当前 API 列表没有订阅消息能力。
     */
    public async requestSubscribeMessage(_tmplIds: string[]): Promise<SubscribeResult> {
        return { success: false, data: {}, errCode: -1, errMsg: "快手小游戏不支持订阅消息" };
    }

    /**
     * 快手小游戏不支持微信系统订阅消息。
     */
    public async requestSubscribeSystemMessage(_msgTypeList: string[]): Promise<SubscribeResult> {
        return { success: false, data: {}, errCode: -1, errMsg: "快手小游戏不支持系统订阅消息" };
    }

    /**
     * 是否支持订阅消息。
     */
    public canSubscribeMessage(): boolean {
        return false;
    }

    /**
     * 是否支持系统订阅消息。
     */
    public canSubscribeSystemMessage(): boolean {
        return false;
    }

    /**
     * 检查快手侧边栏是否可用。
     */
    public async checkSidebar(): Promise<boolean> {
        if (!ks.checkSliderBarIsAvailable) return false;
        return new Promise((resolve) => {
            ks.checkSliderBarIsAvailable({
                success: (res: KuaiShouMiniprogram.CheckSliderBarIsAvailableResult) => {
                    resolve(res.available);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    /**
     * 跳转到快手侧边栏场景。
     */
    public async openSidebar(): Promise<boolean> {
        if (!ks.navigateToScene) return false;
        return new Promise((resolve) => {
            ks.navigateToScene({
                scene: "sidebar",
                success: () => {
                    resolve(true);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    /**
     * 登录获取 code。
     */
    public async login(_force?: boolean): Promise<LoginResult> {
        if (!ks.login) {
            return { success: false, code: "", errMsg: "快手小游戏当前环境不支持登录" };
        }

        return new Promise((resolve) => {
            ks.login({
                success: (res: KuaiShouMiniprogram.LoginResult) => {
                    resolve({ success: true, code: res.code });
                },
                fail: (res: KuaiShouFailResult) => {
                    resolve({ success: false, code: "", errCode: res.code, errMsg: this.getErrorMessage(res) });
                }
            });
        });
    }

    private getSystemInfo(): KuaiShouMiniprogram.SystemInfo {
        if (this._systemInfo) {
            return this._systemInfo;
        }
        if (ks.getSystemInfoSync) {
            this._systemInfo = ks.getSystemInfoSync();
            return this._systemInfo;
        }
        Warn("ks getSystemInfoSync 失败");
        return null;
    }

    /**
     * 将快手触摸数据转换为统一的 TouchData 格式。
     */
    private convertTouchData(res: KuaiShouMiniprogram.TouchEvent): TouchData {
        const convertPoint = (touch: KuaiShouMiniprogram.TouchPoint) => ({
            identifier: touch.identifier,
            screenX: touch.clientX,
            screenY: touch.clientY,
        });
        return {
            touches: res.touches.map(convertPoint),
            changedTouches: res.changedTouches.map(convertPoint),
            timeStamp: res.timeStamp,
        };
    }

    private getErrorMessage(res: KuaiShouFailResult): string {
        return res?.errMsg || res?.msg || "";
    }
}
