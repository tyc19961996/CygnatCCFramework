/** UI */
export { WindowGroup } from "./core/WindowGroup";
export { WindowManager } from "./core/WindowManager";
export { HeaderManager } from "./core/HeaderManager";
export { _uidecorator } from "./decorator";
export {
    AdapterType,
    EReleaseType,
    WindowTransitionKind,
    WindowType,
} from "./interface/type";

export type {
    IShowWindowExtra,
    IWindowTransitionOptions,
} from "./interface/type";

export { defaultWindowTransitionDuration } from "./interface/type";

export type { IWindow } from "./interface/IWindow";
export type { IHeader } from "./interface/IHeader";
export type { IWindowInfo, IHeaderInfo } from "./core/types";

export { WindowBase } from "./window/WindowBase";
export { Header } from "./window/Header";
export { HeaderInfo } from "./window/HeaderInfo";
export { Window } from "./window/Window";
export { InfoPool } from "./core/InfoPool";

/** UI 组件 */
export { default as List } from "./component/List";
export { default as ListItem } from "./component/ListItem";
export { MotionTrail } from "./component/MotionTrail";
export {
    VirtualScrollView,
    ScrollDirection,
    ItemCreationMode,
    RefreshState,
    LoadMoreState,
} from "./component/VScrollView";
export type {
    RenderItemFn,
    ProvideNodeFn,
    OnItemClickFn,
    OnItemLongPressFn,
    PlayItemAppearAnimationFn,
    GetItemHeightFn,
    GetItemTypeIndexFn,
    OnRefreshStateChangeFn,
    OnLoadMoreStateChangeFn,
    OnPageChangeFn,
} from "./component/VScrollView";
export { VScrollViewItem, changeUISortingLayer } from "./component/VScrollViewItem";

/** 引擎相关 */
export { UIModule } from "./engine/UIModule";
export { CocosWindowContainer } from "./engine/CocosWindowContainer";

export { AssetLoader } from "./core/AssetLoader";
export { ResUrls } from "../Asset/AssetInfo";