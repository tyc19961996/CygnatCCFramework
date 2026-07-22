/**
 * @Author: Gongxh
 * @Date: 2025-04-11
 * @Description: 微信小游戏工具类
 */

import { Screen } from "../../Core";
import { IMiniCommon, LoginResult, ReportSceneOptions, SubscribeResult, TouchData } from "../interface/IMiniCommon";

export class BaseCommon implements IMiniCommon {

    protected _userInfoButton: any = null;

    protected _hotLaunchOptions: Record<string, any> = {};
    private _onShowCallbackId: number = 0;
    private _onShowCallbacks: Map<number, (options: Record<string, any>) => void> = new Map();

    private _touchCallbackId: number = 0;
    private _touchStartCallbacks: Map<number, (data: TouchData) => void> = new Map();
    private _touchMoveCallbacks: Map<number, (data: TouchData) => void> = new Map();
    private _touchEndCallbacks: Map<number, (data: TouchData) => void> = new Map();
    private _touchCancelCallbacks: Map<number, (data: TouchData) => void> = new Map();

    public getHotLaunchOptions(): Record<string, any> {
        return this._hotLaunchOptions;
    }

    public addOnShowCallback(callback: (options: Record<string, any>) => void): number {
        const id = ++this._onShowCallbackId;
        this._onShowCallbacks.set(id, callback);
        return id;
    }

    public removeOnShowCallback(id: number): void {
        this._onShowCallbacks.delete(id);
    }

    public removeAllOnShowCallbacks(): void {
        this._onShowCallbacks.clear();
    }

    /** 子类在 onShow 中调用，更新缓存并通知回调 */
    protected _notifyOnShow(options: Record<string, any>): void {
        this._hotLaunchOptions = options;
        this._onShowCallbacks.forEach(cb => cb(options));
    }

    public addTouchStartCallback(callback: (data: TouchData) => void): number {
        const id = ++this._touchCallbackId;
        this._touchStartCallbacks.set(id, callback);
        return id;
    }
    public removeTouchStartCallback(id: number): void {
        this._touchStartCallbacks.delete(id);
    }
    public addTouchMoveCallback(callback: (data: TouchData) => void): number {
        const id = ++this._touchCallbackId;
        this._touchMoveCallbacks.set(id, callback);
        return id;
    }
    public removeTouchMoveCallback(id: number): void {
        this._touchMoveCallbacks.delete(id);
    }
    public addTouchEndCallback(callback: (data: TouchData) => void): number {
        const id = ++this._touchCallbackId;
        this._touchEndCallbacks.set(id, callback);
        return id;
    }
    public removeTouchEndCallback(id: number): void {
        this._touchEndCallbacks.delete(id);
    }
    public addTouchCancelCallback(callback: (data: TouchData) => void): number {
        const id = ++this._touchCallbackId;
        this._touchCancelCallbacks.set(id, callback);
        return id;
    }
    public removeTouchCancelCallback(id: number): void {
        this._touchCancelCallbacks.delete(id);
    }
    public removeAllTouchCallbacks(): void {
        this._touchStartCallbacks.clear();
        this._touchMoveCallbacks.clear();
        this._touchEndCallbacks.clear();
        this._touchCancelCallbacks.clear();
    }

    protected _notifyTouchStart(data: TouchData): void {
        this._touchStartCallbacks.forEach(cb => cb(data));
    }
    protected _notifyTouchMove(data: TouchData): void {
        this._touchMoveCallbacks.forEach(cb => cb(data));
    }
    protected _notifyTouchEnd(data: TouchData): void {
        this._touchEndCallbacks.forEach(cb => cb(data));
    }
    protected _notifyTouchCancel(data: TouchData): void {
        this._touchCancelCallbacks.forEach(cb => cb(data));
    }

    /**
     * 获取冷启动参数
     */
    public getLaunchOptions(): Record<string, any> {
        return {};
    }

    /**
     * 获取基础库版本号
     */
    public getLibVersion(): string {
        return "0.0.1";
    }

    /** 
     * 宿主程序版本 (这里指微信版本)
     */
    public getHostVersion(): string {
        return "0.0.1";
    }

    /**
     * 获取运行平台
     */
    public getPlatform(): 'ios' | 'android' | 'ohos' | 'windows' | 'mac' | 'devtools' {
        return 'windows';
    }

    /**
     * 获取版本类型
     */
    public getEnvType(): 'release' | 'debug' {
        return "debug";
    }

    /**
     * 退出小程序
     */
    public exitMiniProgram(): void {

    }

    public getScreenSize(): { width: number, height: number } {
        return {
            width: Screen.ScreenWidth,
            height: Screen.ScreenHeight
        };
    }

    /**
     * 复制到剪切板
     */
    public setClipboardData(text: string): void {

    }

    public vibrateShort(): void {

    }
    public vibrateLong(): void {

    }

    public shareAppMessage(options: { title?: string, desc?: string, imageUrl?: string, query?: string }, success: () => void, fail: (e) => void, complete: () => void): void {
        success && success();
        complete && complete();
    }

    public async authorize(scope: string): Promise<boolean> {
        return true;
    }
    public async isAuthorized(scope: string): Promise<boolean> {
        return true;
    }
    public async getUserInfo(): Promise<any> {
        return null;
    }
    public async getSetting(withSubscriptions?: boolean): Promise<any> {
        return null;
    }
    public async createUserInfoButton(options: any) {
        return null;
    }
    public async requirePrivacyAuthorize(): Promise<boolean> {
        return true;
    }

    public async requestSubscribeMessage(tmplIds: string[]): Promise<SubscribeResult> {
        return { success: true, data: {} };
    }

    public async requestSubscribeSystemMessage(msgTypeList: string[]): Promise<SubscribeResult> {
        return { success: true, data: {} };
    }

    public canSubscribeMessage(): boolean {
        return false;
    }

    public canSubscribeSystemMessage(): boolean {
        return false;
    }


    public async checkSidebar(): Promise<boolean> {
        return false;
    }

    public async openSidebar(): Promise<boolean> {
        return false;
    }

    public canAddShortcut(): boolean {
        return false;
    }

    public async addShortcut(): Promise<boolean> {
        return false;
    }

    public async checkShortcut(): Promise<boolean> {
        return false;
    }

    public async canAddGameCenterToMyApps(): Promise<boolean> {
        return false;
    }

    public async addGameCenterToMyApps(): Promise<boolean> {
        return false;
    }

    public reportEvent(_event: string, _data?: { [key: string]: any }): void {

    }

    public async jumpToGameCenter(): Promise<boolean> {
        return false;
    }

    public canReportScene(): boolean {
        return false;
    }

    public async reportScene(_options: ReportSceneOptions): Promise<boolean> {
        return false;
    }

    public async login(_force?: boolean): Promise<LoginResult> {
        return { success: false, code: '', errMsg: "当前平台不支持登录" };
    }

    /**
     * 删除获取用户信息按钮
     */
    public destroyUserInfoBtn(): void {
        if (this._userInfoButton) {
            this._userInfoButton.destroy();
            this._userInfoButton = null;
        }
    }

}
