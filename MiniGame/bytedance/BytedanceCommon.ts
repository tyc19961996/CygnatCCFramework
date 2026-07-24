/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 字节跳动小游戏工具类
 */

import { Log, Utils, Warn } from "../../Core";
import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult, ReportSceneOptions, SubscribeResult } from "../interface/IMiniCommon";
import { FeedStatusEvent, IFeedData, IFeedLaunchInfo, IFeedSubscribeOptions, IStoreFeedDataOptions } from "../interface/IMiniFeed";

export class BytedanceCommon extends BaseCommon {
    private _launchOptions: BytedanceMiniprogram.LaunchParams = null;

    private _systemInfo: BytedanceMiniprogram.SystemInfo = null;
    private _envInfo: BytedanceMiniprogram.EnvInfo = null;

    /**
     * @internal
     */
    constructor() {
        super();
        this._launchOptions = tt.getLaunchOptionsSync();
        // 初始化热启动缓存
        this._hotLaunchOptions = this._launchOptions;
        // 监听 onShow 更新缓存
        tt.onShow?.((res: any) => {
            this._notifyOnShow(res);
        });
        // 监听触摸事件
        tt.onTouchStart?.((res: any) => { this._notifyTouchStart(res); });
        tt.onTouchMove?.((res: any) => { this._notifyTouchMove(res); });
        tt.onTouchEnd?.((res: any) => { this._notifyTouchEnd(res); });
        tt.onTouchCancel?.((res: any) => { this._notifyTouchCancel(res); });
    }

    /**
     * 获取冷启动参数
     */
    public getLaunchOptions(): BytedanceMiniprogram.LaunchParams {
        return this._launchOptions;
    }

    /**
     * 获取基础库版本号
     */
    public getLibVersion(): string {
        return this.getSystemInfo()?.SDKVersion || "0.0.1";
    }

    /** 
     * 宿主程序版本 (这里指今日头条、抖音等版本)
     */
    public getHostVersion(): string {
        return this.getSystemInfo()?.version || "0.0.1";
    }

    /**
     * 宿主 APP 名称。示例："Toutiao"
     * 见 [https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/system/system-information/tt-get-system-info-sync]
     */
    public getHostName(): string {
        return this.getSystemInfo()?.appName || "unknown";
    }

    /**
     * 获取运行平台
     */
    public getPlatform(): 'ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools' {
        return this.getSystemInfo().platform as ('ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools');
    }

    /**
     * 获取版本类型
     */
    public getEnvType(): 'release' | 'debug' {
        return this.getEnvInfo().microapp.envType == "production" ? "release" : "debug";
    }

    /**
     * 退出小程序
     */
    public exitMiniProgram(): void {
        tt.exitMiniProgram?.({});
    }

    public vibrateLong(): void {
        tt.vibrateShort();
    }

    public vibrateShort(): void {
        tt.vibrateLong();
    }

    public getScreenSize(): { width: number, height: number } {
        const systemInfo = this.getSystemInfo();
        return {
            width: systemInfo.screenWidth,
            height: systemInfo.screenHeight,
        };
    }

    /**
     * 复制到剪切板
     */
    public setClipboardData(text: string): void {
        tt.setClipboardData({
            data: text,
            fail: (res: { errMsg: string, errNo?: number }) => {
                Warn(`复制到剪切板失败 errCode:${res.errNo} errMsg:${res.errMsg}`);
            }
        });
    }

    private getEnvInfo(): BytedanceMiniprogram.EnvInfo {
        if (this._envInfo) {
            return this._envInfo;
        }
        if (tt.getEnvInfoSync) {
            this._envInfo = tt.getEnvInfoSync();
            return this._envInfo;
        }
        Warn("getEnvInfo 失败");
        return null;
    }

    private getSystemInfo(): BytedanceMiniprogram.SystemInfo {
        if (this._systemInfo) {
            return this._systemInfo;
        }
        if (tt.getSystemInfoSync) {
            this._systemInfo = tt.getSystemInfoSync();
            return this._systemInfo;
        }
        Warn("getSystemInfo 失败");
        return null;
    }

    public shareAppMessage(options: { title?: string, desc?: string, imageUrl?: string, query?: string }, success: () => void, fail: (e) => void, complete: () => void): void {
        tt.shareAppMessage({
            title: options.title,
            desc: options.desc,
            query: options.query,
            success: success,
            fail: fail,
            complete: complete,
        });
    }

    public async requestSubscribeMessage(tmplIds: string[]): Promise<SubscribeResult> {
        return new Promise((resolve) => {
            tt.requestSubscribeMessage({
                tmplIds: tmplIds,
                success: (res) => {
                    const data: Record<string, boolean> = {};
                    for (const id of tmplIds) {
                        data[id] = res[id] === 'accept';
                    }
                    resolve({ success: true, data });
                },
                fail: (res) => {
                    resolve({ success: false, data: {}, errCode: res.errNo, errMsg: res.errMsg });
                }
            });
        });
    }

    public async requestSubscribeSystemMessage(_msgTypeList: string[]): Promise<SubscribeResult> {
        return { success: false, data: {}, errCode: -1, errMsg: "抖音小游戏不支持系统订阅消息" };
    }

    public canSubscribeMessage(): boolean {
        if (!tt.requestSubscribeMessage) return false;

        if (Utils.compareVersion(this.getLibVersion(), '1.73.0') < 0) return false;

        return true;
    }

    public canSubscribeSystemMessage(): boolean {
        return false;
    }

    public async checkSidebar(): Promise<boolean> {
        if (!tt.checkScene || Utils.compareVersion(this.getLibVersion(), '2.92.0') < 0) {
            return false;
        }
        return new Promise((resolve) => {
            tt.checkScene({
                scene: "sidebar",
                success: (res) => {
                    resolve(res.isExist);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    public async openSidebar(): Promise<boolean> {
        return new Promise((resolve) => {
            tt.navigateToScene({
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

    public canAddShortcut(): boolean {
        return !!tt.addShortcut && Utils.compareVersion(this.getLibVersion(), "2.46.0") >= 0;
    }

    public async addShortcut(): Promise<boolean> {
        if (!this.canAddShortcut()) return false;

        return new Promise((resolve) => {
            tt.addShortcut({
                success: () => {
                    resolve(true);
                },
                fail: (res) => {
                    Warn(`抖音添加桌面快捷方式失败 errCode:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    public async checkShortcut(): Promise<boolean> {
        if (!tt.checkShortcut || Utils.compareVersion(this.getLibVersion(), "2.46.0") < 0) {
            return false;
        }
        if (this.getPlatform() !== "android") return false;

        return new Promise((resolve) => {
            tt.checkShortcut({
                success: (res) => {
                    resolve(!!res.status?.exist);
                },
                fail: (res) => {
                    Warn(`抖音检查桌面快捷方式失败 errCode:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * 上报自定义埋点事件
     * tt.reportAnalytics 的 data value 支持 number/string/boolean；事件名不超过 110 字符
     */
    public reportEvent(event: string, data: { [key: string]: any } = {}): void {
        if (!tt.reportAnalytics) return;
        tt.reportAnalytics(event, data);
    }

    /**
     * 请求单项能力授权（如 "scope.userInfo"、"scope.camera"、"scope.record"）
     * 已授权直接返回 true；用户拒绝或调用失败返回 false
     * 注意：新版本抖音在 scope 授权前会前置校验隐私协议授权
     */
    public async authorize(scope: string): Promise<boolean> {
        if (!tt.authorize) return false;

        // 已授权直接通过，避免重复弹窗
        const isAuthorized = await this.isAuthorized(scope);
        if (isAuthorized) return true;

        return new Promise((resolve) => {
            tt.authorize({
                scope: scope,
                success: () => {
                    Log(`抖音请求授权 ${scope} 成功`);
                    resolve(true);
                },
                fail: (res) => {
                    Warn(`抖音请求授权 ${scope} 失败 errNo:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    /** 是否已授权指定 scope */
    public async isAuthorized(scope: string): Promise<boolean> {
        const setting = await this.getSetting();
        return setting?.authSetting?.[scope] ?? false;
    }

    /** 获取用户授权设置（res.authSetting: { [scope]: boolean }） */
    public getSetting(_withSubscriptions?: boolean): Promise<any> {
        if (!tt.getSetting) return Promise.resolve(null);
        return new Promise((resolve) => {
            tt.getSetting({
                success: (res) => resolve(res),
                fail: (res) => {
                    Warn(`抖音获取授权设置失败 errNo:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(null);
                }
            });
        });
    }

    /* ---------------- 推荐流直玩（Feed 直出游戏） ---------------- */

    /**
     * 获取推荐流直玩启动信息
     * 启动参数 scene 尾号 3041 为推荐流直玩启动，其余情况返回 null
     */
    public getFeedLaunchInfo(): IFeedLaunchInfo | null {
        const scene = String(this._launchOptions?.scene ?? "");
        if (!scene.endsWith("3041")) return null;

        const query = (this._launchOptions?.query || {}) as Record<string, any>;
        return {
            scene: Number(query.feed_game_scene) || 0,
            channel: Number(query.feed_game_channel) || 0,
            contentId: String(query.feed_game_content_id ?? ""),
            extra: String(query.feed_game_extra ?? ""),
        };
    }

    /**
     * 是否支持推荐流直玩订阅
     * 基础库 3.34.0+；allScene 全场景订阅需 3.45.0+（通过 canIUse 判断）
     */
    public canFeedSubscribe(allScene: boolean = false): boolean {
        if (!tt.checkFeedSubscribeStatus || !tt.requestFeedSubscribe) return false;
        if (allScene && !(tt.canIUse && tt.canIUse("checkFeedSubscribeStatus.object.allScene"))) return false;
        return true;
    }

    /**
     * 查询推荐流直玩订阅状态（需先 login）
     * 非全场景查询时 options.scene 必传
     */
    public checkFeedSubscribeStatus(options: IFeedSubscribeOptions): Promise<boolean> {
        if (!this.canFeedSubscribe(options?.allScene)) return Promise.resolve(false);
        return new Promise((resolve) => {
            tt.checkFeedSubscribeStatus({
                type: "play",
                scene: options?.scene,
                allScene: options?.allScene,
                success: (res) => resolve(!!res.status),
                fail: (res) => {
                    Warn(`抖音查询直玩订阅状态失败 errNo:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * 发起推荐流直玩订阅弹窗（需先 login）
     * 全场景订阅（allScene）必须由用户点击触发——本方法需在 touchEnd 回调中被同步调用；
     * 非全场景时 options.scene 与 options.contentIDs 必传；有频控限制，注意调用频率
     */
    public requestFeedSubscribe(options: IFeedSubscribeOptions): Promise<boolean> {
        if (!this.canFeedSubscribe(options?.allScene)) return Promise.resolve(false);
        return new Promise((resolve) => {
            tt.requestFeedSubscribe({
                type: "play",
                scene: options?.scene,
                contentIDs: options?.contentIDs,
                allScene: options?.allScene,
                success: (res) => resolve(!!res.success),
                fail: (res) => {
                    Warn(`抖音发起直玩订阅失败 errNo:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * 监听 Feed 流进入/退出小游戏事件（基础库 3.59.0+）
     * 直接透传业务回调给 tt，保证 off 时函数引用一致
     */
    public onFeedStatusChange(callback: (res: FeedStatusEvent) => void): boolean {
        if (!tt.onFeedStatusChange) return false;
        tt.onFeedStatusChange(callback);
        return true;
    }

    /** 取消监听 Feed 流进入/退出事件；不传 callback 时移除所有监听 */
    public offFeedStatusChange(callback?: (res: FeedStatusEvent) => void): void {
        tt.offFeedStatusChange?.(callback);
    }

    /**
     * 存储直玩就绪状态（基础库 3.67.0+，面向无 server 小游戏）
     * 后台配置了 OpenAPI 的无需调用；leftValue 官方当前仅支持毫秒时间戳，不传自动补 "timeStampMs"；有频控
     */
    public storeFeedData(options: IStoreFeedDataOptions): Promise<boolean> {
        if (!tt.storeFeedData) return Promise.resolve(false);
        return new Promise((resolve) => {
            tt.storeFeedData({
                scene: options.scene,
                status: options.status,
                contentID: options.contentID,
                leftValue: options.leftValue || "timeStampMs",
                operator: options.operator,
                rightValue: options.rightValue,
                extra: options.extra,
                success: () => resolve(true),
                fail: (res) => {
                    Warn(`抖音存储直玩就绪状态失败 errNo:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    /**
     * 获取直玩就绪状态数据（基础库 3.67.0+）
     * 有频控；失败或不支持返回 null
     */
    public getFeedData(scene: number, contentID: string): Promise<IFeedData | null> {
        if (!tt.getFeedData) return Promise.resolve(null);
        return new Promise((resolve) => {
            tt.getFeedData({
                scene: scene,
                contentID: contentID,
                success: (res) => resolve({ status: res.status, extra: res.extra ?? "" }),
                fail: (res) => {
                    Warn(`抖音获取直玩就绪状态失败 errNo:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(null);
                }
            });
        });
    }

    public canReportScene(): boolean {
        return !!tt.reportScene && Utils.compareVersion(this.getLibVersion(), "2.88.0") >= 0;
    }

    public async reportScene(options: ReportSceneOptions): Promise<boolean> {
        if (!this.canReportScene()) return false;

        return new Promise((resolve) => {
            tt.reportScene({
                ...options,
                success: () => {
                    resolve(true);
                },
                fail: (res) => {
                    Warn(`抖音场景值上报失败 errCode:${res.errNo} errMsg:${res.errMsg}`);
                    resolve(false);
                }
            });
        });
    }

    public async login(force?: boolean): Promise<LoginResult> {
        return new Promise((resolve) => {
            tt.login({
                force: force ?? false,
                success: (res) => {
                    resolve({
                        success: true,
                        code: res.code,
                        isLogin: res.isLogin,
                        anonymousCode: res.anonymousCode,
                    });
                },
                fail: (res) => {
                    resolve({ success: false, code: '', errCode: res.errNo, errMsg: res.errMsg });
                }
            });
        });
    }

    public getUserInfo(): Promise<any> {
        return new Promise((resolve, reject) => {
            tt.getUserInfo({
                success(res) {
                    resolve(res);
                },
                fail(res) {
                    resolve(null);
                },
            })
        })
    }

}
