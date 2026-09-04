/**
 * @Author: Gongxh
 * @Date: 2024-12-07
 * @Description: 适配用的类
 */

import { ResolutionPolicy, view, Node, UITransform, screen } from "cc";
import { Size } from "../header";
import { Screen } from "./Screen";
import { Log } from "../utils/Logger/Log";
import { calculateSafeAreaFrame } from "./SafeArea";
import type { SafeAreaInsets } from "./SafeArea";

export abstract class Adapter {
    /** 适配器实例 */
    static instance: Adapter;
    /**
     * 监听器
     * @internal
     */
    private listeners: ((...args: any) => void)[] = [];

    /**
     * 添加屏幕尺寸发生变化的监听
     * @param listener 监听器
     */
    public addResizeListener(listener: (...args: any) => void): void {
        this.listeners.push(listener);
    }

    /**
     * 移除屏幕尺寸发生变化的监听
     * @param listener 监听器
     */
    public removeResizeListener(listener: (...args: any) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /** 
     * 初始化适配器
     * @internal
        */
    public init() {
        Adapter.instance = this;
        Log("初始化适配器");
        // 设计尺寸 不会变化
        let designSize = this.getDesignSize();
        Screen.DesignHeight = designSize.height;
        Screen.DesignWidth = designSize.width;
        // view.setDesignResolutionSize(Screen.DesignWidth, Screen.DesignHeight, ResolutionPolicy.SHOW_ALL);

        this.resize();
        this.registerListener((...args: any) => {
            Log("屏幕发生变化", ...args);
            this.resize();

            // 通知所有监听器
            for (const listener of this.listeners) {
                listener(...args);
            }
        });
    }

    /** 
     * 调整屏幕尺寸
     * @internal
     */
    protected resize(): void {
        // 屏幕像素尺寸
        const winSize = this.getScreenSize();
        const isDesignLandscape = Screen.DesignWidth > Screen.DesignHeight;
        const isLandscape = winSize.width > winSize.height;
        if (isDesignLandscape == isLandscape) {
            Screen.ScreenWidth = winSize.width;
            Screen.ScreenHeight = winSize.height;
        } else {
            Screen.ScreenWidth = winSize.height;
            Screen.ScreenHeight = winSize.width;
        }
        Screen.SafeArea = this.getSafeAreaInsets(Screen.ScreenWidth, Screen.ScreenHeight);
        Screen.SafeAreaHeight = Math.max(
            Screen.SafeArea.top,
            Screen.SafeArea.bottom,
            Screen.SafeArea.left,
            Screen.SafeArea.right,
        );
        const safeAreaFrame = calculateSafeAreaFrame(Screen.ScreenWidth, Screen.ScreenHeight, Screen.SafeArea);
        Screen.SafeWidth = safeAreaFrame.width;
        Screen.SafeHeight = safeAreaFrame.height;
        this.printScreen();
    }

    /** Platform adapters return logical screen-coordinate insets. */
    protected getSafeAreaInsets(screenWidth: number, screenHeight: number): SafeAreaInsets {
        return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    /** 
     * 打印屏幕信息
     * @internal
     */
    private printScreen() {
        Log(`设计分辨率: ${Screen.DesignWidth}x${Screen.DesignHeight}`);
        Log(`屏幕分辨率: ${Screen.ScreenWidth}x${Screen.ScreenHeight}`);
        Log(`安全区域边距: top=${Screen.SafeArea.top}, bottom=${Screen.SafeArea.bottom}, left=${Screen.SafeArea.left}, right=${Screen.SafeArea.right}`);
        Log(`安全区宽高: ${Screen.SafeWidth}x${Screen.SafeHeight}`);
    }

    /**
     * 获取屏幕尺寸
     * @abstract 子类实现
     * @returns {Size}
     * @internal
     */
    protected abstract getScreenSize(): Size;

    /**
     * 获取设计尺寸
     * @abstract 子类实现
     * @returns {Size}
     * @internal
     */
    protected abstract getDesignSize(): Size;

    /**
     * 注册尺寸发生变化的监听器
     * @abstract 子类实现
     * @param listener 监听器
     * @internal
     */
    protected abstract registerListener(listener: (...args: any) => void): void;

    /**
    * 获取cocos 节点在小程序屏幕上的位置
    * @param node 
    * @returns 
    */
    public static getNodeInScreenRect(node: Node) {
        const rect = node.getComponent(UITransform)!.getBoundingBoxToWorld();
        const dpi = screen.devicePixelRatio;
        const scaleX = view.getScaleX();
        const scaleY = view.getScaleY();
        const left = (rect.x * scaleX) / dpi;
        const top = (screen.windowSize.height - (rect.y + rect.height) * scaleY) / dpi;
        const width = (rect.width * scaleX) / dpi;
        const height = (rect.height * scaleY) / dpi;
        return { left, top, width, height };
    }
}
