/**
 * @Author: Gongxh
 * @Date: 2025-12-25
 * @Description: 信息池 注册的窗口、header、自定义组件的信息
 */

import { IHeaderInfo, IWindowInfo } from "./types";

/** @internal */
export class InfoPool {
    /** @internal */
    private static _windowInfos: Map<string, IWindowInfo> = new Map(); // 窗口信息池 窗口名 -> 窗口信息

    /** @internal */
    private static _headerInfos: Map<string, IHeaderInfo> = new Map();  // 窗口header信息池 窗口header名 -> header信息

    /** @internal */
    private static _customPackageBundle: Map<string, string> = new Map(); // UI包所在的bundle名 1对1 默认: resources

    /** @internal */
    private static _customPackagePath: Map<string, string> = new Map();  // 自定义UI包所在的路径 1对1

    /** @internal */
    private static _windowBundles: Map<string, string> = new Map(); // 窗口名对应的包名列表 窗口名 -> 包名列表

    /**
     * 添加窗口信息
     * @param ctor 类的构造函数
     * @param group 窗口组名
     * @param bundle 包名
     * @param name 窗口名
     * @param bundleName bundle名
     * @internal
     */
    public static add(ctor: any, group: string, bundle: string, name: string): void {
        if (this.has(name)) {
            console.warn(`窗口【${name}】已注册，跳过，请检查是否重复注册`);
            return;
        }
        console.log(`窗口注册  窗口名:${name} bundle名:${bundle} 组名:${group}`);
        this._windowInfos.set(name, {
            ctor: ctor,
            group: group,
            bundle: bundle,
            name: name
        });

        this.addWindowPkg(name, bundle);
    }

    /**
     * 注册窗口header信息
     * @param ctor 类的构造函数
     * @param bundle 包名
     * @param name 窗口名
     * @param bundleName bundle名
     * @internal
     */
    public static addHeader(ctor: any, bundle: string, name: string): void {
        if (this.hasHeader(name)) {
            console.warn(`header【${name}】已注册，跳过，请检查是否重复注册`);
            return;
        }
        console.log(`header注册  header名:${name} 包名:${bundle}`);
        this._headerInfos.set(name, {
            ctor: ctor,
            bundle: bundle
        });
    }

    /**
     * 是否存在窗口信息
     * @param name 窗口名
     * @returns 是否存在
     * @internal
     */
    public static has(name: string): boolean {
        return this._windowInfos.has(name);
    }

    /**
     * 获取窗口信息
     * @param name 窗口名
     * @returns 窗口信息
     * @internal
     */
    public static get(name: string): IWindowInfo {
        if (!this.has(name)) {
            throw new Error(`窗口【${name}】未注册，请使用 _uidecorator.uiclass 注册窗口`);
        }
        return this._windowInfos.get(name);
    }

    /**
     * 是否存在窗口header信息
     * @param name 窗口header名
     * @returns 是否存在
     * @internal
     */
    public static hasHeader(name: string): boolean {
        return this._headerInfos.has(name);
    }

    /**
     * 获取窗口header信息
     * @param name 窗口header名
     * @returns 窗口header信息
     * @internal
     */
    public static getHeader(name: string): IHeaderInfo {
        if (!this.hasHeader(name)) {
            throw new Error(`窗口header【${name}】未注册，请使用 _uidecorator.uiheader 注册窗口header`);
        }
        return this._headerInfos.get(name);
    }

    /** 
     * 设置UI包所在的bundle名
     * @param pkg 包名
     * @param bundleName bundle名
     * @internal
     */
    public static addBundleName(pkg: string, bundleName: string): void {
        if (this._customPackageBundle.has(pkg)) {
            console.warn(`UI包【${pkg}】已设置过包名`);
            return;
        }
        this._customPackageBundle.set(pkg, bundleName);
    }

    /** 
     * 获取UI包所在的bundle名
     * @param pkg 包名
     * @returns bundle名
     * @internal
     */
    public static getBundleName(pkg: string): string {
        return this._customPackageBundle.get(pkg) || "resources";
    }

    /**
     * UI包所在的自定义路径
     * @param pkg 包名
     * @param path 路径
     * @internal
     */
    public static addPackagePath(pkg: string, path: string): void {
        if (this._customPackagePath.has(pkg)) {
            console.warn(`UI包【${pkg}】已设置过自定义路径`);
            return;
        }
        this._customPackagePath.set(pkg, path);
    }

    /**
     * 获取UI包所在的路径
     * @param pkg 包名
     * @returns 路径
     * @internal
     */
    public static getPackagePath(pkg: string): string {
        return `${this._customPackagePath.get(pkg) || 'ui'}/${pkg}`;
    }

    /** 
     * 添加窗口需要的包名
     * @param windowName 窗口名
     * @param bundle 包名
     * @internal
     */
    public static addWindowPkg(windowName: string, bundle: string): void {
        if (!this._windowBundles.has(windowName)) {
            this._windowBundles.set(windowName, bundle);
        }
    }

    /**
     * 获取窗口需要的包名列表
     * @param windowName 窗口名
     * @returns 包名列表
     * @internal
     */
    public static getWindowBundle(windowName: string): string {
        return this._windowBundles.get(windowName) || "";
    }


}