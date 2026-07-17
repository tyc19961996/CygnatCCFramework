/**

 * @Author: Gongxh

 * @Date: 2024-12-14

 * @Description: 窗口基类和fgui组件对接

 */

import { BlockInputEvents, Component, Layout, Node, Size, tween, Tween, UITransform, UIOpacity, v3, Vec3, warn } from "cc";
import { Screen } from "../../Core";
import { HeaderManager } from "../core/HeaderManager";
import { WindowManager } from "../core/WindowManager";
import { IWindow } from "../interface/IWindow";
import { AdapterType, defaultWindowTransitionDuration, EReleaseType, IWindowTransitionOptions, WindowTransitionKind, WindowType } from "../interface/type";
import { HeaderInfo } from "./HeaderInfo";

export abstract class WindowBase<T = any, U = any> extends Component implements IWindow<T, U> {

    /** 窗口类型 */
    public type: WindowType = WindowType.Normal;



    /** 窗口适配类型 */
    public adapterType: AdapterType = AdapterType.Full;



    /** 底部遮罩的透明度 */
    public bgAlpha: number;



    /** 释放类型 */
    public releaseType: EReleaseType = EReleaseType.None;



    /** @internal */
    private _swallowNode: Node = null; // 吞噬触摸的节点



    /** @internal */
    private _isTop: boolean = true;



    /** 记录初始缩放，供多次打开动效使用 */
    private _baseScale: Vec3 = new Vec3(1, 1, 1);



    /**
     * 初始化方法 (框架内部使用)
     * @param swallowTouch 是否吞噬触摸事件
     * @param bgAlpha 底部遮罩的透明度
     * @internal
     */
    public _init(swallowTouch: boolean): void {

        // 窗口根节点上启用的 Layout 会把下面注入的全屏吞噬节点纳入排版，导致窗口被撑满/错位
        const layout = this.node.getComponent(Layout);
        if (layout && layout.enabled) {
            warn(`[Window] ${this.node.name} 根节点挂有启用的 Layout，会与框架注入的吞噬触摸节点冲突（窗口可能被撑满）。请把 Layout 移到内容子节点或禁用它。`);
        }

        // 窗口本身可能留有安全区的边, 所以需要一个全屏的节点来吞噬触摸事件

        let bgNode = new Node();
        bgNode.name = "swallow";
        bgNode.addComponent(UITransform);
        this.node.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        bgNode.addComponent(BlockInputEvents);
        this._swallowNode = bgNode;
        this._swallowNode.active = swallowTouch;

        this._isTop = true;
        this.bgAlpha = WindowManager.bgAlpha;
        this._captureBaseScale();
        this.onInit();

    }



    /**
     * 适配窗口
     * @internal
     */
    public _adapted(): void {

        switch (this.adapterType) {
            case AdapterType.Full:
                this._setSize(this.node, Screen.ScreenWidth, Screen.ScreenHeight);
                break;
            case AdapterType.Bang:
                this._setSize(this.node, Screen.SafeWidth, Screen.SafeHeight);
                break;
            default:
                break;

        }

        // 吞噬触摸的节点

        this._setSize(this._swallowNode, Screen.ScreenWidth, Screen.ScreenHeight);

        this.onAdapted();
        this._captureBaseScale();

    }



    private _captureBaseScale(): void {
        const s = this.node.scale;
        this._baseScale.set(s.x, s.y, s.z);
    }



    private _setSize(node: Node, width: number, height: number) {
        const uiTrans = node.getComponent(UITransform);
        if (!uiTrans) {
            return;
        }
        uiTrans.setContentSize(new Size(width, height));
    }



    /**
     * @internal
     */

    private _transitionDuration(transition?: IWindowTransitionOptions): number {
        const d = transition?.duration;
        return d != null && d > 0 ? d : defaultWindowTransitionDuration;
    }



    private _stopUiTweens(): void {
        Tween.stopAllByTarget(this.node);
        const op = this.node.getComponent(UIOpacity);
        if (op) {
            Tween.stopAllByTarget(op);
        }
    }


    private _ensureUiOpacity(): UIOpacity {
        let op = this.node.getComponent(UIOpacity);
        if (!op) {
            op = this.node.addComponent(UIOpacity);
        }
        return op;
    }



    /**

     * 窗口关闭

     * @internal

     */

    public _close(transition?: IWindowTransitionOptions, afterTerminated?: () => void): void {

        this._stopUiTweens();

        const kind = transition?.kind ?? WindowTransitionKind.None;
        const dur = this._transitionDuration(transition);
        const finalize = () => {
            this.onClose();
            this.node.destroy();
            afterTerminated?.();
        };

        if (kind === WindowTransitionKind.None) {
            finalize();
            return;
        }

        if (kind === WindowTransitionKind.Scale) {
            tween(this.node)
                .to(dur, { scale: v3(0, 0, this._baseScale.z) }, { easing: 'quadIn' })
                .call(finalize)
                .start();
            return;

        }

        const op = this._ensureUiOpacity();
        tween(op)
            .to(dur, { opacity: 0 })
            .call(finalize)
            .start();
    }



    /**

     * 显示窗口 (框架内部使用)

     * @param userdata 用户自定义数据

     * @internal

     */

    public _show(userdata?: T, transition?: IWindowTransitionOptions): void {

        this._stopUiTweens();
        this.node.active = true;

        const kind = transition?.kind ?? WindowTransitionKind.None;
        const dur = this._transitionDuration(transition);

        this._captureBaseScale();

        const sx = this._baseScale.x;
        const sy = this._baseScale.y;
        const sz = this._baseScale.z;

        if (kind === WindowTransitionKind.Scale) {
            this.node.setScale(0, 0, sz);
        } else if (kind === WindowTransitionKind.Fade) {
            const op = this._ensureUiOpacity();
            op.opacity = 0;
        } else {
            const op = this.node.getComponent(UIOpacity);
            if (op) {
                op.opacity = 255;
            }
        }

        this.onShow(userdata);



        if (kind === WindowTransitionKind.Scale) {
            tween(this.node)
                .to(dur, { scale: v3(sx, sy, sz) }, { easing: 'backOut' })
                .start();
        } else if (kind === WindowTransitionKind.Fade) {
            const op = this._ensureUiOpacity();
            tween(op).to(dur, { opacity: 255 }).start();
        }

    }



    /**
     * 隐藏窗口 (框架内部使用)
     * @internal
     */
    public _hide(): void {
        this.node.active = false;
        this.onHide();
    }

    /**
     * 从隐藏状态恢复显示
     * @internal
     */
    public _showFromHide(): void {
        this.node.active = true;
        this.onShowFromHide();
    }



    /**
     * 除忽略的窗口组外, 显示到最上层时
     * @internal
     */
    public _toTop(): void {
        this._isTop = true;
        this.onToTop();
    }



    /**
     * 除忽略的窗口组外, 被上层窗口覆盖时
     * @internal
     */
    public _toBottom(): void {
        this._isTop = false;
        this.onToBottom();
    }



    /**
     * 设置窗口深度
     * @param depth 深度
     * @internal
     */

    public setDepth(depth: number): void {
        this.node.setSiblingIndex(depth);
    }



    public isShowing(): boolean {
        return this.node.active;
    }



    /** 是否在最上层显示 (除忽略的窗口组外, 显示到最上层时) */

    public isTop(): boolean {
        return this._isTop;
    }



    /** @internal */

    public screenResize(): void {
        this._adapted();
    }



    /**

     * 获取窗口顶部资源栏数据 默认返回空数组

     * @returns {HeaderInfo}

     */

    public abstract getHeaderInfo(): HeaderInfo<any>;



    /**

     * 刷新顶部资源栏

     * 调用这个方法会重新创建 或者 刷新header

     * 用来在同一个界面显示不同的header

     */

    public refreshHeader(): void {

        HeaderManager.refreshWindowHeader(this.name, this.getHeaderInfo());

    }



    /**

     * 用于在界面中关闭自己

     */

    protected removeSelf(closeTransition?: IWindowTransitionOptions): void {
        WindowManager.closeWindowByName(this.name, closeTransition);
    }



    protected abstract onAdapted(): void;



    protected abstract onInit(): void;

    protected abstract onClose(): void;



    protected abstract onShow(userdata?: T): void;

    protected abstract onShowFromHide(): void;

    protected abstract onHide(): void;



    protected abstract onToTop(): void;

    protected abstract onToBottom(): void;



    protected abstract onEmptyAreaClick(): void;

}


