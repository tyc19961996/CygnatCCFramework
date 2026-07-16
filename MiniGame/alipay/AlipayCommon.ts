/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 支付宝小游戏工具类
 */

import { Log, Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, SubscribeResult, TouchData } from "../interface/IMiniCommon";


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
        // 初始化热启动缓存
        this._hotLaunchOptions = my.getEnterOptionsSync?.() || this._launchOptions;

        // 监听 onShow 更新缓存并通知回调
        my.onShow?.((res: AliyMiniprogram.AppLaunchOptions) => {
            this._notifyOnShow(res);
        });

        // 监听触摸事件
        my.onTouchStart?.((res: AliyMiniprogram.TouchEvent) => { this._notifyTouchStart(this._convertTouchData(res)); });
        my.onTouchMove?.((res: AliyMiniprogram.TouchEvent) => { this._notifyTouchMove(this._convertTouchData(res)); });
        my.onTouchEnd?.((res: AliyMiniprogram.TouchEvent) => { this._notifyTouchEnd(this._convertTouchData(res)); });
        my.onTouchCancel?.((res: AliyMiniprogram.TouchEvent) => { this._notifyTouchCancel(this._convertTouchData(res)); });
    }

    public getLaunchOptions(): AliyMiniprogram.AppLaunchOptions {
        return this._launchOptions;
    }

    /**
     * 获取基础库版本号
     */
    public getLibVersion(): string {
        return my.SDKVersion;
    }

    public login(_force?: boolean): Promise<LoginResult> {
        return new Promise((resolve) => {
            my.getAuthCode({
                scopes: 'auth_base',
                success: (res) => resolve({ success: true, code: res.authCode }),
                fail: (res: AliyMiniprogram.CallBack.Fail) => resolve({ success: false, code: "", errCode: res.error, errMsg: res.errorMessage }),
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

    /** 短震动 (40ms) */
    public vibrateShort(): void {
        my.vibrateShort?.({ type: "medium" });
    }

    /** 长震动 (400ms) */
    public vibrateLong(): void {
        my.vibrateLong?.();
    }

    /**
     * 分享
     * 支付宝没有 shareAppMessage 主动分享接口，通过 onShareAppMessage 设置分享内容后唤起分享面板
     */
    public shareAppMessage(options: { title?: string, desc?: string, imageUrl?: string, query?: string }, success: () => void, fail: (e) => void, complete: () => void): void {
        if (!my.showSharePanel) {
            fail?.({ errMsg: "支付宝小游戏当前基础库不支持分享面板" });
            complete?.();
            return;
        }
        // 注册分享内容，唤起分享面板或点击右上角分享时使用
        my.onShareAppMessage = () => ({
            title: options.title,
            desc: options.desc,
            imageUrl: options.imageUrl,
            success: success,
            fail: fail,
            complete: complete,
        });
        my.showSharePanel();
    }

    /**
     * 请求授权
     * 支付宝没有 wx.authorize 对应接口：
     * 会员信息授权通过 getAuthCode(auth_user) 弹出授权框；其他 scope 在调用对应 API 时由平台自动弹窗
     */
    public async authorize(scope: string): Promise<boolean> {
        const authorized = await this.isAuthorized(scope);
        if (authorized) return true;

        if (this._normalizeScope(scope) === "userInfo") {
            return new Promise((resolve) => {
                my.getAuthCode({
                    scopes: 'auth_user',
                    success: () => resolve(true),
                    fail: (res: AliyMiniprogram.CallBack.Fail) => {
                        Log(`支付宝用户授权失败 code:${res.error} msg:${res.errorMessage}`);
                        resolve(false);
                    }
                });
            });
        }
        return false;
    }

    /**
     * 是否已授权
     */
    public async isAuthorized(scope: string): Promise<boolean> {
        const setting = await this.getSetting();
        return setting?.authSetting?.[this._normalizeScope(scope)] ?? false;
    }

    /**
     * 获取用户信息（昵称、头像）
     * 需要用户授权会员基础信息，未授权时会自动弹出授权框
     */
    public async getUserInfo(): Promise<any> {
        if (!my.getAuthUserInfo) return null;
        return new Promise((resolve) => {
            my.getAuthUserInfo({
                success: (res) => {
                    resolve(res);
                },
                fail: () => {
                    resolve(null);
                }
            });
        });
    }

    /**
     * 获取设置
     * @param withSubscriptions 是否同时获取订阅消息的订阅状态
     */
    public async getSetting(withSubscriptions?: boolean): Promise<AliyMiniprogram.GetSettingResult | null> {
        if (!my.getSetting) return null;
        return new Promise((resolve) => {
            my.getSetting({
                withSubscriptions,
                success: (res) => {
                    resolve(res);
                },
                fail: () => {
                    resolve(null);
                }
            });
        });
    }

    /**
     * 创建用户信息按钮
     * 支付宝没有 createUserInfoButton 对应接口，用户信息通过 getUserInfo 直接获取
     */
    public async createUserInfoButton(_options: any): Promise<any> {
        return null;
    }

    /**
     * 隐私协议授权查询
     * 支付宝没有对应接口，隐私授权由平台在调用相关 API 时处理，默认按无需额外授权处理
     */
    public async requirePrivacyAuthorize(): Promise<boolean> {
        return true;
    }

    /**
     * 请求订阅消息 (基础库 2.7.10 或更高版本)
     * @param tmplIds 消息模板 id 集合（一次最多 3 个，一次性/长期性模板不可混用）
     */
    public async requestSubscribeMessage(tmplIds: string[]): Promise<SubscribeResult> {
        if (!this.canSubscribeMessage()) {
            return { success: false, data: {}, errCode: -1, errMsg: "支付宝小游戏当前基础库不支持订阅消息" };
        }
        return new Promise((resolve) => {
            my.requestSubscribeMessage({
                entityIds: tmplIds,
                success: (res) => {
                    const subscribed = res?.result?.subscribedEntityIds || [];
                    const data: Record<string, boolean> = {};
                    for (const id of tmplIds) {
                        data[id] = subscribed.includes(id);
                    }
                    resolve({ success: true, data });
                },
                fail: (res: AliyMiniprogram.CallBack.Fail) => {
                    resolve({ success: false, data: {}, errCode: res.error, errMsg: res.errorMessage });
                }
            });
        });
    }

    /** 支付宝不支持微信式系统订阅消息 */
    public async requestSubscribeSystemMessage(_msgTypeList: string[]): Promise<SubscribeResult> {
        return { success: false, data: {}, errCode: -1, errMsg: "支付宝小游戏不支持系统订阅消息" };
    }

    /** 是否支持订阅消息 */
    public canSubscribeMessage(): boolean {
        return !!my.requestSubscribeMessage;
    }

    /** 是否支持系统订阅消息（仅微信支持） */
    public canSubscribeSystemMessage(): boolean {
        return false;
    }

    /** 支付宝没有侧边栏场景（仅抖音支持） */
    public async checkSidebar(): Promise<boolean> {
        return false;
    }

    /** 支付宝没有侧边栏场景（仅抖音支持） */
    public async openSidebar(): Promise<boolean> {
        return false;
    }

    /**
     * 支付宝没有添加手机桌面快捷方式的接口
     * 平台仅提供 my.addGameCenterToMyApps（添加"游戏中心"到支付宝首页），语义不同，未做映射
     */
    public canAddShortcut(): boolean {
        return false;
    }

    /** 支付宝不支持添加桌面快捷方式 */
    public async addShortcut(): Promise<boolean> {
        return false;
    }

    /** 支付宝不支持检查桌面快捷方式 */
    public async checkShortcut(): Promise<boolean> {
        return false;
    }

    /** 支付宝不支持启动场景值上报 */
    public canReportScene(): boolean {
        return false;
    }

    /**
     * 判断游戏中心是否能够添加到支付宝首页（基础库 2.1.57 或更高版本）
     * 不可添加的情况（疲劳度检测不通过、已在首页、达到添加次数上限）走 fail 回调，统一返回 false
     */
    public async canAddGameCenterToMyApps(): Promise<boolean> {
        if (!my.canAddGameCenterToMyApps) return false;
        return new Promise((resolve) => {
            my.canAddGameCenterToMyApps({
                success: (res) => {
                    resolve(!!res.canAddAppToMyApps);
                },
                fail: (res: AliyMiniprogram.CallBack.Fail) => {
                    Log(`支付宝游戏中心不可添加到首页 code:${res.error} msg:${res.errorMessage}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * 添加游戏中心到支付宝首页（基础库 2.1.57 或更高版本）
     * 调用后弹出确认面板，需用户手动确认；建议先调用 canAddGameCenterToMyApps 判断
     * @returns 是否成功添加（用户取消返回 false）
     */
    public async addGameCenterToMyApps(): Promise<boolean> {
        if (!my.addGameCenterToMyApps) return false;
        return new Promise((resolve) => {
            my.addGameCenterToMyApps({
                success: (res) => {
                    resolve(!!res.addAppToMyApps);
                },
                fail: (res: AliyMiniprogram.CallBack.Fail) => {
                    Log(`支付宝游戏中心添加到首页失败 code:${res.error} msg:${res.errorMessage}`);
                    resolve(false);
                }
            });
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

    /**
     * 将支付宝触摸数据转换为统一的 TouchData 格式（clientX/clientY → screenX/screenY）
     * changedTouches/timeStamp 文档未列出，部分版本可能缺失，做兜底处理
     */
    private _convertTouchData(res: AliyMiniprogram.TouchEvent): TouchData {
        const convertList = (touches: AliyMiniprogram.TouchPoint[]) => {
            if (!touches) {
                return [];
            }
            return Array.from(touches, (touch) => ({
                identifier: touch.identifier || 0,
                screenX: touch.clientX ?? 0,
                screenY: touch.clientY ?? 0,
            }));
        };
        return {
            touches: convertList(res.touches),
            changedTouches: convertList(res.changedTouches || res.touches),
            timeStamp: res.timeStamp || Date.now(),
        };
    }

    /** 统一 scope 命名：微信风格的 "scope.userInfo" → 支付宝 authSetting 的 "userInfo" */
    private _normalizeScope(scope: string): string {
        return scope?.startsWith("scope.") ? scope.substring(6) : scope;
    }
}
