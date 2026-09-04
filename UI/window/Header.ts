/**
 * @Author: Gongxh
 * @Date: 2025-01-11
 * @Description: 窗口顶边栏
 * 窗口顶边资源栏 同组中只会有一个显示
 */

import { Component, Node, Size, UITransform, Vec3 } from "cc";
import { IHeader } from "../interface/IHeader";
import { AdapterType } from "../interface/type";
import { Screen } from "../../Core";
import { calculateSafeAreaFrame } from "../../Core/engine/SafeArea";


export abstract class Header<T = any> extends Component implements IHeader<T> {
    /** 窗口适配类型 */
    public adapterType: AdapterType = AdapterType.Full;

    protected abstract onInit(): void;
    protected abstract onShow(userdata?: T): void;

    protected onAdapted(): void { };
    protected onClose(): void { };
    protected onHide(): void { };
    protected onShowFromHide(): void { };

    /** 窗口预制体的初始位置 */
    private _basePosition: Vec3 = new Vec3();

    /**
     * 是否显示中
     */
    public isShowing(): boolean {
        return this.node.active;
    }

    /**
     * 初始化 (内部方法)
     * @internal
     */
    public _init(): void {
        this.onInit();
        this._basePosition.set(this.node.position.x, this.node.position.y, this.node.position.z);
    }

    /**
     * 关闭 (内部方法)
     * @internal
     */
    public _close(): void {
        this.onClose();
        this.node.destroy();
    }

    /**
     * 窗口适配
     * @internal
     */
    public _adapted(): void {

        switch (this.adapterType) {
            case AdapterType.Full:
                this._setSize(this.node, Screen.ScreenWidth, Screen.ScreenHeight);
                break;
            case AdapterType.Bang:
                const safeAreaFrame = calculateSafeAreaFrame(Screen.ScreenWidth, Screen.ScreenHeight, Screen.SafeArea);
                this._setSize(this.node, safeAreaFrame.width, safeAreaFrame.height);
                this.node.setPosition(
                    this._basePosition.x + safeAreaFrame.offsetX,
                    this._basePosition.y + safeAreaFrame.offsetY,
                    this._basePosition.z,
                );
            default:
                break;

        }

        this.onAdapted();
    }

    private _setSize(node: Node, width: number, height: number) {
        const uiTrans = node.getComponent(UITransform);
        if (!uiTrans) {
            return;
        }
        uiTrans.setContentSize(new Size(width, height));
    }



    /**
     * 显示
     * @param userdata 用户数据
     * @internal
     */
    public _show(userdata: T): void {
        this.node.active = true;
        this.onShow(userdata);
    }

    /**
     * 隐藏
     * @internal
     */
    public _hide(): void {
        this.node.active = false;
        this.onHide();
    }
}