import type { MiniPageManager } from "../MiniGame/interface/IMiniPageManager";

declare const manager: MiniPageManager;
declare const nativeManager: WechatMiniprogram.PageManager;

const closeListener = (event: { reason: string }) => { void event.reason; };
manager.on("onClose", closeListener);
manager.off("onClose", closeListener);
nativeManager.on("onClose", closeListener);
nativeManager.off("onClose", closeListener);
