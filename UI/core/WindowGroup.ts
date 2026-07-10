/**
 * @Author: Gongxh
 * @Date: 2024-12-08
 * @Description: 窗口组 (在同一个窗口容器的上的窗口)
 */

import { instantiate, Node, Prefab } from "cc";
import { IWindow } from "../interface/IWindow";
import { EReleaseType, IShowWindowExtra, IWindowTransitionOptions, WindowTransitionKind, WindowType } from "../interface/type";
import { WindowBase } from "../window/WindowBase";
import { HeaderManager } from "./HeaderManager";
import { IWindowInfo } from "./types";
import { WindowManager } from "./WindowManager";
import { AssetLoader } from "./AssetLoader";
import { PerUtils } from "../../Core/utils/PerUtils";
import { Log } from "../../Core";

export class WindowGroup {
    /** @internal */
    private _name: string = ""; // 窗口组的名字

    /** @internal */
    private _root: Node; // 窗口组的根节点

    /** @internal */
    private _ignore: boolean = false; // 忽略查询

    /** @internal */
    private _swallowTouch: boolean = false; // 吞噬触摸事件

    /** @internal */
    private _windowNames: string[] = []; // 窗口名列表 顺序为窗口显示的层级 (最后一个显示在最上层)

    /**
     * 获取窗口组的名称。
     * @returns {string} 窗口组的名称。
     */
    public get name(): string { return this._name; }

    /** 获取窗口组的根节点 */
    public get root(): Node { return this._root; }

    /**
     * 获取当前窗口组中窗口的数量。
     * @returns 窗口数量
     */
    public get size(): number { return this._windowNames.length; }

    /** 获取窗口组中窗口的名称列表 */
    public get windowNames(): string[] { return this._windowNames; }

    /**
     * 获取是否忽略查询的状态。
     * @returns {boolean} 如果忽略查询，则返回 true，否则返回 false。
     */
    public get isIgnore(): boolean { return this._ignore; }

    /**
     * 实例化 
     * @param name 组名
     * @param root 窗口组的根节点 一个fgui的组件
     * @param ignoreQuery 是否忽略顶部窗口查询
     * @param swallowTouch 是否吞掉触摸事件
     * @param bgAlpha 半透明遮罩的透明度
     * @internal
     */
    constructor(name: string, root: Node, ignoreQuery: boolean, swallowTouch: boolean) {
        this._name = name;
        this._root = root;
        this._ignore = ignoreQuery;
        this._swallowTouch = swallowTouch;
        this._windowNames = [];
    }

    /**
     * 显示一个窗口
     * @param info 窗口信息
     * @param userdata
     * @internal
     */
    public async showWindow<T = any, U = any>(info: IWindowInfo, userdata?: T, extra?: IShowWindowExtra): Promise<IWindow<T, U>> {
        let lastTopWindow = WindowManager.getTopWindow();

        if (WindowManager.hasWindow(info.name)) {
            const window = WindowManager.getWindow<IWindow>(info.name);
            this.showAdjustment(window, userdata, extra, () => {
                if (lastTopWindow && lastTopWindow.name !== window.name && !this.isIgnore) {
                    lastTopWindow._toBottom();
                    window._toTop();
                }
            });
            return window;
        } else {
            try {
                PerUtils.start();
                WindowManager.addWaitRef();
                const prefab = await AssetLoader.loadFormPrefab(info.bundle, info.name);
                const window = await this.createWindow(info.bundle, info.name, prefab);
                WindowManager.decWaitRef();
                PerUtils.End(`showWindow: ${info.name}`);

                this.showAdjustment(window, userdata, extra, () => {
                    if (lastTopWindow && lastTopWindow.name !== window.name && !this.isIgnore) {
                        lastTopWindow._toBottom();
                    }
                });

                return window;
            } catch (err: any) {
                WindowManager.decWaitRef();
                throw new Error(`窗口【${info.name}】打开失败: ${err.message}`);
            }
        }

    }

    /**
     * show一个界面后的调整
     * @param window 
     * @internal
     */
    private showAdjustment(window: IWindow, userdata?: any, extra?: IShowWindowExtra, afterPresent?: () => void): void {
        this.moveWindowToTop(window, extra, () => {
            window._show(userdata, extra?.openTransition);
            HeaderManager.showHeader(window.name);
            WindowManager.adjustAlphaGraph();
            afterPresent?.();
        });
    }

    /**
     * 将指定名称的窗口移动到窗口组的最顶层。
     * @internal
     */
    private moveWindowToTop(window: IWindow, extra: IShowWindowExtra | undefined, onReady: () => void): void {
        if (window.name !== this._windowNames[this.size - 1]) {
            const index = this._windowNames.indexOf(window.name);
            if (index < 0) {
                console.error(`[BUG] 窗口【${window.name}】不在数组中，数据结构已损坏`);
                onReady();
                return;
            }
            this._windowNames.splice(index, 1);
            this._windowNames.push(window.name);
        }
        this._processWindowCloseStatus(window, extra, () => {
            window.setDepth(this._root.children.length - 1);
            this.processWindowHideStatus(this.size - 1);
            onReady();
        });
    }

    /**
     * 根据窗口名创建窗口 并添加到显示节点
     * @param windowName 窗口名
     * @internal
     */
    private async createWindow(bundle: string, name: string, prefab: Prefab): Promise<WindowBase> {
        const window = instantiate(prefab);
        const windowBase = window.getComponent(WindowBase);
        windowBase.name = name;
        windowBase._init(this._swallowTouch);
        windowBase._adapted();
        // 添加到显示节点
        this._root.addChild(windowBase.node);
        // 窗口组之前没有窗口, 显示窗口组节点
        if (this.size === 0) {
            this._root.active = true;
        }
        this._windowNames.push(name);
        WindowManager.addWindow(name, windowBase);

        // 处理header（只请求，不立即添加到节点，由adjustHeaderDepth动态管理）
        await HeaderManager.requestHeader(name, windowBase.getHeaderInfo());
        return windowBase;
    }

    /**
     * 处理index下层窗口的隐藏状态的私有方法。递归调用
     * @param index - 窗口索引
     */
    private processWindowHideStatus(startIndex: number): void {
        let curWindow = WindowManager.getWindow(this._windowNames[startIndex]);
        // 如果当前是当前组中的最后一个窗口并且当前窗口是隐藏状态 则恢复隐藏
        if (curWindow && startIndex == this.size - 1 && !curWindow.isShowing()) {
            curWindow._showFromHide();
            // 恢复显示header
            HeaderManager.showHeader(curWindow.name);
        }
        // 已经是最后一个了
        if (startIndex <= 0) {
            return;
        }

        // 遍历到倒数第二个窗口停止
        for (let index = startIndex; index > 0; index--) {
            let window = WindowManager.getWindow(this._windowNames[index]);
            if (!window) {
                console.error(`[BUG] 窗口【${this._windowNames[index]}】不存在，数据结构已损坏`);
                return;
            }
            if (window.type === WindowType.HideAll) {
                // 隐藏所有
                for (let i = index - 1; i >= 0; i--) {
                    let name = this._windowNames[i];
                    const window = WindowManager.getWindow(name);
                    if (window && window.isShowing()) {
                        window._hide();
                        // 隐藏header
                        HeaderManager.hideHeader(name);
                    }
                }
                break;
            } else if (window.type === WindowType.HideOne) {
                // 隐藏前一个窗口
                let prevWindowName = this._windowNames[index - 1];
                let prevWindow = WindowManager.getWindow(prevWindowName);
                if (prevWindow && prevWindow.isShowing()) {
                    prevWindow._hide();
                    // 隐藏header
                    HeaderManager.hideHeader(prevWindowName);
                }
            } else {
                // 如果前一个窗口是隐藏状态 需要恢复显示
                let prevWindowName = this._windowNames[index - 1];
                let prevWindow = WindowManager.getWindow(prevWindowName);
                if (prevWindow && !prevWindow.isShowing()) {
                    prevWindow._showFromHide();
                    // 恢复显示header（使用记录的userdata）
                    HeaderManager.showHeader(prevWindowName);
                }
            }

        }
    }

    /**
     * 根据传入窗口的关闭类型, 处理上一个窗口或者所有窗口的关闭
     * @param window 新创建的窗口
     * @internal
     */
    private _processWindowCloseStatus(window: IWindow, extra: IShowWindowExtra | undefined, onDone: () => void): void {
        if (window.type === WindowType.CloseOne) {
            if (this.size < 2) {
                onDone();
                return;
            }
            const name = this._windowNames[this.size - 2];
            this._windowNames.splice(this.size - 2, 1);
            const win = WindowManager.getWindow<WindowBase>(name);
            if (!win) {
                console.error(`[BUG] 窗口【${name}】不存在，数据结构已损坏`);
                onDone();
                return;
            }
            const tr = extra?.closeReplacedTransition;
            const kind = tr?.kind ?? WindowTransitionKind.None;
            if (kind === WindowTransitionKind.None) {
                HeaderManager.releaseHeader(name);
                win._close(undefined, () => {
                    WindowManager.removeWindow(name);
                    onDone();
                });
            } else {
                win._close(tr, () => {
                    HeaderManager.releaseHeader(name);
                    WindowManager.removeWindow(name);
                    onDone();
                });
            }
            return;
        }
        if (window.type === WindowType.CloseAll) {
            // CloseAll：仅支持无动画（忽略 closeReplacedTransition）
            for (let i = this.size - 2; i >= 0; i--) {
                const name = this._windowNames[i];
                const win = WindowManager.getWindow<WindowBase>(name);
                if (!win) {
                    console.error(`[BUG] 窗口【${name}】不存在，数据结构已损坏`);
                    continue;
                }
                try {
                    HeaderManager.releaseHeader(name);
                    win._close(undefined, () => {
                        WindowManager.removeWindow(name);
                    });
                } catch (err) {
                    console.error(`关闭窗口【${name}】时发生异常:`, err);
                }
            }
            this._windowNames.splice(0, this.size - 1);
            onDone();
            return;
        }
        onDone();
    }

    /**
     * 移除指定名称的窗口。
     * @param name 窗口的名称。
     * @internal
     */
    /**
     * @param closeTransition 关窗动效；默认无动画
     * @param wmCleanup WindowManager 在移除后执行的遮罩与顶层回调（由 WindowManager.closeWindowByName 传入）
     */
    public removeWindow(name: string, closeTransition?: IWindowTransitionOptions, wmCleanup?: () => void): void {
        let window = WindowManager.getWindow<WindowBase>(name);
        if (!window) {
            console.error(`[BUG] 窗口【${name}】不存在，数据结构已损坏`);
            return;
        }
        let index = this._windowNames.lastIndexOf(name);
        if (index < 0) {
            console.error(`[BUG] 窗口【${name}】不在数组中，数据结构已损坏`);
            return;
        }
        this._windowNames.splice(index, 1);

        const kind = closeTransition?.kind ?? WindowTransitionKind.None;
        const finishRemove = () => {
            WindowManager.removeWindow(name);
            const releaseType = window.releaseType;
            if (releaseType === EReleaseType.ReleaseRef) {
                AssetLoader.destoryFormPrefab(name);
            } else if (releaseType === EReleaseType.ReleaseDynamic) {
                AssetLoader.destoryDynamicRes(name);
            } else if (releaseType === EReleaseType.ReleaseAll) {
                AssetLoader.destoryFormPrefab(name);
                AssetLoader.destoryDynamicRes(name);
            }

            if (this.size == 0) {
                this._root.active = false;
            } else {
                this.processWindowHideStatus(this.size - 1);
            }
            wmCleanup?.();
        };

        if (kind === WindowTransitionKind.None) {
            HeaderManager.releaseHeader(name);
            window._close(undefined, finishRemove);
        } else {
            window._close(closeTransition, () => {
                HeaderManager.releaseHeader(name);
                finishRemove();
            });
        }
    }

    public hasWindow(name: string): boolean {
        return this._windowNames.indexOf(name) >= 0;
    }

    /**
     * 获取窗口组顶部窗口实例
     * @returns {IWindow} 顶部窗口实例
     */
    public getTopWindow<T extends IWindow>(): T {
        if (this.size > 0) {
            return WindowManager.getWindow<T>(this._windowNames[this.size - 1]);
        }
        console.warn(`窗口组【${this._name}】中不存在窗口`);
        return null;
    }

    /**
     * 关闭窗口组中的所有窗口
     * @param ignores 不关闭的窗口名
     * @internal
     */
    public closeAllWindow(ignores: IWindow[] = []): void {
        let len = this.size - 1;
        for (let i = len; i >= 0; i--) {
            let name = this._windowNames[i];
            // 如果当前窗口在ignores列表中，跳过
            if (ignores.some(ignore => ignore.name === name)) {
                continue;
            }
            const window = WindowManager.getWindow<IWindow>(name);
            if (!window) {
                console.error(`[BUG] 窗口【${name}】不存在，数据结构已损坏`);
                return;
            }
            HeaderManager.releaseHeader(name);
            window._close(undefined, () => {
                WindowManager.removeWindow(name);
            });
            this._windowNames.splice(i, 1);
        }
        // 统一处理窗口的显示状态
        if (this.size == 0) {
            this._root.active = false;
        } else {
            this.processWindowHideStatus(this.size - 1);
        }
    }
}
