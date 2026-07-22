/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 支付宝小游戏工具类
 */

import { Log, Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, SubscribeResult, TouchData } from "../interface/IMiniCommon";


/**
 * my.navigateToMiniProgram 参数（由 alipays schema 解析而来，chInfo 会转入 startParam）
 */
interface IAliNavigateParams {
    appId: string;
    [key: string]: string | Record<string, string>;
}

export class AlipayCommon extends BaseCommon {

    /** 游戏中心 openURL 跳转链接（Android 用，iOS 需追加 %26startMultApp%3DYES；链接需在开放平台控制台加入 openURL 白名单） */
    private static readonly GAME_CENTER_OPEN_URL: string = "alipays://platformapi/startapp?appId=2060090000285522&url=https%3A%2F%2Frender.alipay.com%2Fp%2Fyuyan%2F180020010001210691%2Findex.html%3FcaprMode%3Dsync&sourceAppId=2021003125685383&sourceUrl=alipays%3A%2F%2Fplatformapi%2Fstartapp%3FappId%3D2021003125685383%26url%3Dhttps%253A%252F%252Frender.alipay.com%252Fp%252Fyuyan%252F180020010001206617%252Findex.html%253FcaprMode%253Dsync%26chInfo%3Dreturnvisit%26sms%3DYES%26appClearTop%3Dfalse";

    /** 游戏中心 navigateToMiniProgram schema（Android 用，iOS 需追加 &startMultApp=YES） */
    private static readonly GAME_CENTER_NAVIGATE_SCHEMA: string = "alipays://platformapi/startapp?appId=2021003125685383&url=https%3A%2F%2Frender.alipay.com%2Fp%2Fyuyan%2F180020010001206617%2Findex.html%3FcaprMode%3Dsync&chInfo=returnvisit&sms=YES&appClearTop=false";

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

    /**
     * 上报自定义埋点事件（游戏中心任务埋点）
     * my.gameBiz 在低版本客户端可能不存在，调用前判空
     */
    public reportEvent(event: string, data: { [key: string]: any } = {}): void {
        if (my.gameBiz && my.gameBiz.reportCustomEvent) {
            my.gameBiz.reportCustomEvent(event, data);
        }
    }

    /**
     * 判断支付宝客户端版本是否不低于指定版本
     * @param version 版本号，如 "10.5.60"
     */
    public isAlipayVersionAtLeast(version: string): boolean {
        const hostVersion = this.getSystemInfo()?.version;
        if (!hostVersion) {
            return false;
        }
        return this._compareVersion(hostVersion, version) >= 0;
    }

    /**
     * 跳转支付宝游戏中心（复访任务）
     * my.ap.openURL 存在时优先 openURL 包装链，否则 navigateToMiniProgram schema；iOS 需追加 startMultApp=YES
     * @returns 是否成功发起跳转
     */
    public jumpToGameCenter(): Promise<boolean> {
        const platform = this.getSystemInfo()?.platform ?? "";
        const isIos = platform === "iOS" || platform === "iPhone OS";
        if (my.ap && my.ap.openURL) {
            const suffix = isIos ? "%26startMultApp%3DYES" : "";
            return this._jumpToGameCenterByOpenUrl(AlipayCommon.GAME_CENTER_OPEN_URL + suffix);
        }
        const suffix = isIos ? "&startMultApp=YES" : "";
        return this._navigateToMiniProgramBySchema(AlipayCommon.GAME_CENTER_NAVIGATE_SCHEMA + suffix);
    }

    /**
     * openURL 跳转游戏中心
     * 报"跳转地址不在白名单内"时，需在开放平台控制台把链接加入 openURL 白名单（运营侧配置）
     */
    private _jumpToGameCenterByOpenUrl(url: string): Promise<boolean> {
        return new Promise((resolve) => {
            my.ap.openURL({
                url: url,
                success: () => resolve(true),
                fail: (res: AliyMiniprogram.CallBack.Fail) => {
                    Warn(`openURL 跳转游戏中心失败 code:${res.error} msg:${res.errorMessage}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * navigateToMiniProgram 跳转游戏中心（schema 解析为参数）
     */
    private _navigateToMiniProgramBySchema(schema: string): Promise<boolean> {
        const { params, message } = this._schemaToParams(schema);
        if (!params) {
            Warn(`无效的小程序 schema ${schema}: ${message}`);
            return Promise.resolve(false);
        }
        return new Promise((resolve) => {
            my.navigateToMiniProgram({
                ...params,
                success: () => resolve(true),
                fail: (res: AliyMiniprogram.CallBack.Fail) => {
                    Warn(`navigateToMiniProgram 跳转游戏中心失败 code:${res.error} msg:${res.errorMessage}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * 解析 alipays schema 为 navigateToMiniProgram 参数
     * chInfo 转入 startParam，appId 必须为 16 位
     */
    private _schemaToParams(schema: string): { params?: IAliNavigateParams, message?: string } {
        if (!schema.startsWith("alipays:")) {
            return { message: "非 alipays: 开头" };
        }
        const params: IAliNavigateParams = { appId: "" };
        const parseQuery = (str: string): string[][] => {
            return str.replace(/^.*?\?/, "").split("&").map((s) => {
                const p = s.includes("=") ? s.indexOf("=") : s.length;
                return [s.slice(0, p), s.slice(p + 1)].map(decodeURIComponent);
            });
        };
        for (const [k, v] of parseQuery(schema)) {
            if (k === "appId") {
                if (v.length !== 16) {
                    return { message: `非 16 位 appId '${v}'` };
                }
            } else if (k === "chInfo") {
                const startParam = (params["startParam"] as Record<string, string>) || {};
                startParam[k] = v;
                params["startParam"] = startParam;
                continue;
            }
            params[k] = v;
        }
        return { params };
    }

    /**
     * 比较版本号
     * @returns 1: v1 > v2；0: 相等；-1: v1 < v2
     */
    private _compareVersion(v1: string, v2: string): number {
        const list1 = v1.split(".");
        const list2 = v2.split(".");
        const len = Math.max(list1.length, list2.length);
        for (let i = 0; i < len; i++) {
            const num1 = parseInt(list1[i], 10) || 0;
            const num2 = parseInt(list2[i], 10) || 0;
            if (num1 !== num2) {
                return num1 > num2 ? 1 : -1;
            }
        }
        return 0;
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
