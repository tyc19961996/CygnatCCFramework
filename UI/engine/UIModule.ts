/**
 * @Author: Gongxh
 * @Date: 2024-12-07
 * @Description: cocos UI模块
 */
import { _decorator, Node } from "cc";

import { WindowManager } from "../core/WindowManager";
import { CocosWindowContainer } from "./CocosWindowContainer";
import { CocosUtils, Log, Module, Screen,Adapter } from "../../Core";

const { ccclass, menu, property } = _decorator;

@ccclass("UIModule")
@menu("bit/UIModule")
export class UIModule extends Module {

    @property({ displayName: "底部遮罩透明度", tooltip: "半透明遮罩的默认透明度", min: 0, max: 1, step: 0.01 })
    bgAlpha: number = 0.75;

    @property({ displayName: "自动释放UI资源", tooltip: "界面关闭时自动释放加载的资源" })
    autoReleaseUIRes: boolean = true;

    @property({ type: Node, displayName: "遮罩节点" })
    alphGraph: Node = null;

    @property({ type: Node, displayName: "显示加载等待窗", tooltip: "显示加载等待窗" })
    waitingEffect: Node = null;
    /** 模块名称 */
    public moduleName: string = "UI模块";

    public onInit(): void {

        // ResLoader.setAutoRelease(this.autoReleaseUIRes);

        // 设置底部遮罩的默认透明度
        WindowManager.bgAlpha = this.bgAlpha;

        /** 初始化窗口管理系统 */
        Log("初始化 WindowContainers");

        // const alphaGraph = new GGraph();
        // alphaGraph.touchable = false;
        // alphaGraph.name = "bgAlpha";
        // alphaGraph.setPosition(Screen.ScreenWidth * 0.5, Screen.ScreenHeight * 0.5);
        // alphaGraph.setSize(Screen.ScreenWidth, Screen.ScreenHeight, true);
        // alphaGraph.setPivot(0.5, 0.5, true);
        // alphaGraph.visible = false;
        // WindowManager.setAlphaGraph(alphaGraph);

        if (this.waitingEffect) {
            CocosUtils.setActive(this.waitingEffect, false);
            WindowManager.setPackageCallbacks({
                showWaitWindow: this.showWaitingEffect.bind(this),
                hideWaitWindow: this.hideWaitingEffect.bind(this),
                fail: null
            });
        }

        if (this.alphGraph) {
            this.alphGraph.active = false;
            CocosUtils.setNodeSize(this.alphGraph, Screen.ScreenWidth, Screen.ScreenHeight);
            WindowManager.setAlphaGraph(this.alphGraph);
        }

        for (const container of this.getComponentsInChildren(CocosWindowContainer)) {
            container.init();
        }
        Adapter.instance.addResizeListener(this.onScreenResize.bind(this));
    }

    private showWaitingEffect(): void {
        CocosUtils.setActive(this.waitingEffect, true);
    }

    private hideWaitingEffect(): void {
        CocosUtils.setActive(this.waitingEffect, false);
    }

    /**
     * 屏幕大小改变时被调用
     * @internal
     */
    private onScreenResize(...args: any[]): void {
        WindowManager.onScreenResize();
    }
}