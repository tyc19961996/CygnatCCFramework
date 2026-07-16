/** UI */
export { WindowGroup } from "./core/WindowGroup";
export { WindowManager } from "./core/WindowManager";
export { _uidecorator } from "./decorator";
export {
    AdapterType,
    WindowTransitionKind,
    WindowType,
} from "./interface/type";

export type {
    IShowWindowExtra,
    IWindowTransitionOptions,
} from "./interface/type";

export { defaultWindowTransitionDuration } from "./interface/type";

export { Header } from "./window/Header";
export { HeaderInfo } from "./window/HeaderInfo";
export { Window } from "./window/Window";
export { InfoPool } from "./core/InfoPool";

/** 引擎相关 */
export { UIModule } from "./engine/UIModule";
export { CocosWindowContainer } from "./engine/CocosWindowContainer";

export { AssetLoader } from "./core/AssetLoader";
export { ResUrls } from "../Asset/AssetInfo";