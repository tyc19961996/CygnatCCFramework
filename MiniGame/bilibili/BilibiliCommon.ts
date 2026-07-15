/**
 * @Author: Codex
 * @Date: 2026-07-13
 * @Description: Bilibili 小游戏通用能力适配
 */

import { Utils, Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, ReportSceneOptions, SubscribeResult, TouchData } from "../interface/IMiniCommon";

type BilibiliPlatform = 'ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools';

/**
 * Bilibili 小游戏通用能力适配。
 *
 * 这里只实现 MiniHelper 已抽象出的通用能力；平台未提供或当前业务暂不需要的能力，
 * 会返回 false/null，而不是抛错打断游戏主流程。
 */
export class BilibiliCommon extends BaseCommon {
    /** 冷启动参数缓存。 */
    private _launchOptions: BilibiliMiniprogram.LaunchOptions = null;
    /** 系统信息缓存，避免频繁调用同步平台 API。 */
    private _systemInfo: BilibiliMiniprogram.SystemInfo = null;

    constructor() {
        super();
        // 冷启动参数用于首帧业务判断；热启动参数用于从侧边栏/分享等场景回到游戏后的补偿逻辑。
        this._launchOptions = bl.getLaunchOptionsSync?.() || {};
        this._hotLaunchOptions = bl.getEnterOptionsSync?.() || this._launchOptions;

        // 统一转发平台生命周期和触摸事件到 BaseCommon 的回调池。
        bl.onShow?.((res: BilibiliMiniprogram.LaunchOptions) => {
            this._notifyOnShow(res);
        });
        bl.onTouchStart?.((res: BilibiliMiniprogram.TouchEvent) => {
            this._notifyTouchStart(this.convertTouchData(res));
        });
        bl.onTouchMove?.((res: BilibiliMiniprogram.TouchEvent) => {
            this._notifyTouchMove(this.convertTouchData(res));
        });
        bl.onTouchEnd?.((res: BilibiliMiniprogram.TouchEvent) => {
            this._notifyTouchEnd(this.convertTouchData(res));
        });
        bl.onTouchCancel?.((res: BilibiliMiniprogram.TouchEvent) => {
            this._notifyTouchCancel(this.convertTouchData(res));
        });
    }

    /** 获取冷启动参数。 */
    public getLaunchOptions(): BilibiliMiniprogram.LaunchOptions {
        return this._launchOptions;
    }

    /** 获取 Bilibili 小游戏基础库版本。 */
    public getLibVersion(): string {
        return this.getSystemInfo()?.SDKVersion || "0.0.1";
    }

    /** 获取 Bilibili APP 版本。 */
    public getHostVersion(): string {
        return this.getSystemInfo()?.version || "0.0.1";
    }

    /** 获取运行平台。 */
    public getPlatform(): BilibiliPlatform {
        return (this.getSystemInfo()?.platform || "devtools") as BilibiliPlatform;
    }

    /** Bilibili 当前没有统一暴露 release/debug 环境类型，这里按线上环境处理。 */
    public getEnvType(): 'release' | 'debug' {
        return "release";
    }

    /** 退出小游戏。 */
    public exitMiniProgram(): void {
        bl.exitMiniProgram?.({
            fail: (res) => {
                Warn(`退出 Bilibili 小游戏失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /** 获取屏幕尺寸，优先使用 screenWidth/screenHeight，缺失时用 window 尺寸兜底。 */
    public getScreenSize(): { width: number, height: number } {
        const systemInfo = this.getSystemInfo();
        return {
            width: systemInfo?.screenWidth || systemInfo?.windowWidth || 0,
            height: systemInfo?.screenHeight || systemInfo?.windowHeight || 0,
        };
    }

    /** 设置剪切板内容。 */
    public setClipboardData(text: string): void {
        if (!bl.setClipboardData) return;
        bl.setClipboardData({
            data: text,
            fail: (res) => {
                Warn(`Bilibili 复制到剪切板失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /** 短震动。 */
    public vibrateShort(): void {
        bl.vibrateShort?.({
            type: "medium",
            fail: (res) => {
                Warn(`Bilibili 短震动失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /** 长震动。 */
    public vibrateLong(): void {
        bl.vibrateLong?.({
            fail: (res) => {
                Warn(`Bilibili 长震动失败 ${this.getErrorMessage(res)}`);
            }
        });
    }

    /** 主动分享。 */
    public shareAppMessage(
        options: { title?: string, desc?: string, imageUrl?: string, query?: string },
        success: () => void,
        fail: (e) => void,
        complete: () => void
    ): void {
        if (!bl.shareAppMessage) {
            fail?.({ errMsg: "Bilibili 小游戏当前环境不支持分享" });
            complete?.();
            return;
        }

        bl.shareAppMessage({
            title: options.title,
            desc: options.desc,
            imageUrl: options.imageUrl,
            query: options.query,
            success,
            fail,
            complete,
        });
    }

    /** 请求授权；如果已经授权则直接返回 true。 */
    public async authorize(scope: string): Promise<boolean> {
        if (!bl.authorize) return false;
        const isAuthorized = await this.isAuthorized(scope);
        if (isAuthorized) return true;

        return new Promise((resolve) => {
            bl.authorize({
                scope,
                success: () => {
                    resolve(true);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    /** 查询指定 scope 是否已授权。 */
    public async isAuthorized(scope: string): Promise<boolean> {
        const setting = await this.getSetting();
        return setting?.authSetting?.[scope] ?? false;
    }

    /** 获取用户信息。 */
    public async getUserInfo(): Promise<BilibiliMiniprogram.GetUserInfoResult | null> {
        if (!bl.getUserInfo) return null;
        return new Promise((resolve) => {
            bl.getUserInfo({
                success: (res) => {
                    resolve(res);
                },
                fail: () => {
                    resolve(null);
                }
            });
        });
    }

    /** 获取授权设置。 */
    public async getSetting(withSubscriptions?: boolean): Promise<BilibiliMiniprogram.GetSettingResult | null> {
        if (!bl.getSetting) return null;
        return new Promise((resolve) => {
            bl.getSetting({
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

/** 创建用户信息按钮；重复创建前先销毁旧按钮。 */
    public async createUserInfoButton(
        options: any
    ): Promise<any> {
        if (!bl.createUserInfoButton) return null;

        const { title, left = 0, top = 0, width = 0, height = 0 } = options;

        this.destroyUserInfoBtn();

        return new Promise((resolve, reject) => {
            this._userInfoButton = bl.createUserInfoButton({
                type: 'text',
                text: title,
                style: {
                    left: left,
                    top: top,
                    width: width,
                    height: height,
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

    /** Bilibili 暂未接入项目统一隐私授权弹窗，默认无需额外授权。 */
    public async requirePrivacyAuthorize(): Promise<boolean> {
        return true;
    }

    /** 请求订阅消息。 */
    public async requestSubscribeMessage(tmplIds: string[]): Promise<SubscribeResult> {
        if (!bl.requestSubscribeMessage) {
            return { success: false, data: {}, errCode: -1, errMsg: "Bilibili 小游戏不支持订阅消息" };
        }

        return new Promise((resolve) => {
            bl.requestSubscribeMessage({
                tmplIds,
                success: (res) => {
                    const data: Record<string, boolean> = {};
                    for (const id of tmplIds) {
                        data[id] = res[id] === "accept";
                    }
                    resolve({ success: true, data });
                },
                fail: (res) => {
                    resolve({ success: false, data: {}, errCode: res.errCode, errMsg: this.getErrorMessage(res) });
                }
            });
        });
    }

    /** Bilibili 不支持微信式系统订阅消息。 */
    public async requestSubscribeSystemMessage(_msgTypeList: string[]): Promise<SubscribeResult> {
        return { success: false, data: {}, errCode: -1, errMsg: "Bilibili 小游戏不支持系统订阅消息" };
    }

    /** 是否支持普通订阅消息。 */
    public canSubscribeMessage(): boolean {
        return !!bl.requestSubscribeMessage;
    }

    /** 是否支持系统订阅消息。 */
    public canSubscribeSystemMessage(): boolean {
        return false;
    }

    /** 检查侧边栏场景是否存在。 */
    public async checkSidebar(): Promise<boolean> {
        if (!bl.checkScene) return false;
        return new Promise((resolve) => {
            bl.checkScene({
                scene: "sidebar",
                success: (res) => {
                    resolve(!!(res.isExist || res.exist || res.available));
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    /** 跳转到侧边栏场景。 */
    public async openSidebar(): Promise<boolean> {
        if (!bl.navigateToScene) return false;
        return new Promise((resolve) => {
            bl.navigateToScene({
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

    /** 添加小游戏快捷方式到手机桌面。 */
    public canAddShortcut(): boolean {
        return this.canUseShortcutApi() && !!bl.addShortcut;
    }

    /** 添加小游戏快捷方式到手机桌面。 */
    public async addShortcut(): Promise<boolean> {
        if (!this.canAddShortcut()) return false;

        return new Promise((resolve) => {
            bl.addShortcut({
                success: () => {
                    resolve(true);
                },
                fail: (res) => {
                    Warn(`Bilibili 添加桌面快捷方式失败 ${this.getErrorMessage(res)}`);
                    resolve(false);
                }
            });
        });
    }

    /** 检查小游戏快捷方式是否已添加到手机桌面。 */
    public async checkShortcut(): Promise<boolean> {
        if (!this.canUseShortcutApi() || !bl.checkShortcut) return false;
        if (this.getPlatform() !== "android") return false;

        return new Promise((resolve) => {
            bl.checkShortcut({
                success: (res) => {
                    resolve(!!res.status?.exist);
                },
                fail: (res) => {
                    Warn(`Bilibili 检查桌面快捷方式失败 ${this.getErrorMessage(res)}`);
                    resolve(false);
                }
            });
        });
    }

    /** 是否支持启动场景值上报。 */
    public canReportScene(): boolean {
        return !!bl.reportScene && Utils.compareVersion(this.getLibVersion(), "3.99.9") >= 0;
    }

    /** 上报启动场景值。 */
    public async reportScene(options: ReportSceneOptions): Promise<boolean> {
        if (!this.canReportScene()) return false;

        return new Promise((resolve) => {
            bl.reportScene({
                ...options,
                success: () => {
                    resolve(true);
                },
                fail: (res) => {
                    Warn(`Bilibili 场景值上报失败 ${this.getErrorMessage(res)}`);
                    resolve(false);
                }
            });
        });
    }

    /** 登录获取 code，后续由 LGameAPI 发送到服务端换取 openid/token。 */
    public async login(_force?: boolean): Promise<LoginResult> {
        if (!bl.login) {
            return { success: false, code: "", errMsg: "Bilibili 小游戏当前环境不支持登录" };
        }

        return new Promise((resolve) => {
            bl.login({
                success: (res) => {
                    resolve({ success: true, code: res.code });
                },
                fail: (res) => {
                    resolve({ success: false, code: "", errCode: res.errCode, errMsg: this.getErrorMessage(res) });
                }
            });
        });
    }

    /** 获取并缓存系统信息。 */
    private getSystemInfo(): BilibiliMiniprogram.SystemInfo {
        if (this._systemInfo) {
            return this._systemInfo;
        }
        try {
            this._systemInfo = bl.getSystemInfoSync?.() || null;
        } catch (error) {
            Warn("bl getSystemInfoSync 失败", error);
            this._systemInfo = null;
        }
        return this._systemInfo;
    }

    /** 将 Bilibili 触摸事件转换为 MiniHelper 统一 TouchData。 */
    private convertTouchData(res: BilibiliMiniprogram.TouchEvent): TouchData {
        return {
            touches: this.convertTouchList(res.touches),
            changedTouches: this.convertTouchList(res.changedTouches),
            timeStamp: res.timeStamp || Date.now(),
        };
    }

    /** 将 TouchList/类数组触摸集合转换为真正数组，避免 TouchList 没有 map 方法。 */
    private convertTouchList(touches: ArrayLike<BilibiliMiniprogram.TouchPoint>): TouchData["touches"] {
        if (!touches) {
            return [];
        }

        return Array.from(touches, (touch) => ({
            identifier: touch.identifier || 0,
            screenX: touch.screenX ?? touch.clientX ?? touch.pageX ?? 0,
            screenY: touch.screenY ?? touch.clientY ?? touch.pageY ?? 0,
        }));
    }

    private canUseShortcutApi(): boolean {
        return Utils.compareVersion(this.getLibVersion(), "3.99.4") >= 0;
    }

    /** 提取平台错误信息。 */
    private getErrorMessage(res: BilibiliMiniprogram.CallbackResult): string {
        return res?.errMsg || res?.msg || "";
    }
}
