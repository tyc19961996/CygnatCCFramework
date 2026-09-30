import { MiniGame } from "../header";

// 旧版 IMiniCommon 的结构化实现仍可赋给新增接口。
type LegacyCommon = Omit<MiniGame.IMiniCommon, "createPageManager">;
declare const legacyCommon: LegacyCommon;
const compatibleCommon: MiniGame.IMiniCommon = legacyCommon;
void compatibleCommon;

async function checkPageManagerContract(): Promise<void> {
    const manager: MiniGame.MiniPageManager | null = MiniGame.MiniHelper.common().createPageManager();
    if (!manager) return;

    const loadOptions: MiniGame.MiniPageManagerLoadOptions = {
        openlink: "wx-openlink",
        query: { id: "123" },
        extraData: { source: "game" },
    };
    const loadResult: unknown = await manager.load(loadOptions);
    const showResult: unknown = await manager.show();
    await manager.show({ openlink: "wx-openlink" });
    const listener = (...args: unknown[]) => { void args; };
    manager.on("onClose", listener);
    manager.off("onClose", listener);
    const closeListener = (event: { reason: string }) => { void event.reason; };
    manager.on("onClose", closeListener);
    manager.off("onClose", closeListener);
    manager.destroy();
    void loadResult;
    void showResult;

    // @ts-expect-error load 必须提供 openlink
    const missingOpenlink: MiniGame.MiniPageManagerLoadOptions = {};
    void missingOpenlink;
}

void checkPageManagerContract;
