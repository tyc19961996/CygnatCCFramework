import { MiniHelper } from "../MiniGame";

async function checkShortcutContract(): Promise<void> {
    const common = MiniHelper.common();
    const canAdd: boolean = common.canAddShortcut();
    const added: boolean = await common.addShortcut();
    const exists: boolean = await common.checkShortcut();

    void canAdd;
    void added;
    void exists;
}

void checkShortcutContract;
