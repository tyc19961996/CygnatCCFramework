/**
 * @Author: Gongxh
 * @Date: 2024-12-08
 * @Description: 窗口的一些类型配置 
 */

/** 窗口显示时，对其他窗口的隐藏处理类型 */
export enum WindowType {
    /** 不做任何处理 */
    Normal = 0,
    /** 关闭所有 */
    CloseAll = 1 << 0,
    /** 关闭上一个 */
    CloseOne = 1 << 1,
    /** 隐藏所有 */
    HideAll = 1 << 2,
    /** 隐藏上一个 */
    HideOne = 1 << 3,
}

/** 窗口打开/关闭动效类型 */
export enum WindowTransitionKind {
    /** 无动画 */
    None = 0,
    /** 缩放 */
    Scale = 1,
    /** 渐变（透明度） */
    Fade = 2,
}

/** 单次打开或关闭使用的动效参数 */
export interface IWindowTransitionOptions {
    kind: WindowTransitionKind;
    /** 秒；缺省由框架使用统一默认时长 */
    duration?: number;
}

/** 打开窗口时的可选扩展（动效、被 CloseOne 替换窗口的关窗动效） */
export interface IShowWindowExtra {
    /** 本窗口打开动效 */
    openTransition?: IWindowTransitionOptions;
    /**
     * 仅当本窗口 type 为 CloseOne 时有效：被关闭的上一窗口使用的关窗动效。
     * CloseAll 时忽略此项，被关窗口一律无动画。
     */
    closeReplacedTransition?: IWindowTransitionOptions;
}

/** @internal */
export const defaultWindowTransitionDuration = 0.22;

/** 窗口适配类型，默认全屏 */
export enum AdapterType {
    /** 全屏适配 */
    Full = 0,
    /** 空出刘海 */
    Bang = 1,
    /** 固定的 不适配 */
    Fixed = 2,
}

/** 定义装饰器元数据的key */
export enum MetadataKey {
    /** 属性 */
    prop = "__uipropmeta__",
    /** 回调 */
    callback = "__uicbmeta__",
    /** 控制器 */
    control = "__uicontrolmeta__",
    /** 动画 */
    transition = "__uitransitionmeta__",
    /** 原始名称 */
    originalName = "__UI_ORIGINAL_NAME__",
}

/** 
 * 窗口属性基类
 */
export interface IDecoratorInfo {
    /** 构造函数 */
    ctor: any;
    /** 属性 */
    props: Record<string, 1>;
    /** 方法 */
    callbacks: Record<string, Function>;
    /** 控制器 */
    controls: Record<string, 1>;
    /** 动画 */
    transitions: Record<string, 1>;

    res: {
        /** bundle名 */
        bundle: string;
        /** 组件名 */
        name: string;
        /** 窗口组名称 可选(只有窗口才会设置) */
        group?: string;
    }
}

export enum EReleaseType {
    /** 不释放 */
    None = 0,
    /** 释放引用 */
    ReleaseRef = 1,
    /** 释放动态加载 */
    ReleaseDynamic = 2,
    /** 释放全部  引用+动态 */
    ReleaseAll = 3,
}