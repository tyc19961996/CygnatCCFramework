import { MiniGame } from "../header";

async function harmonyAccountContract(): Promise<void> {
    const login: MiniGame.LoginResult = await MiniGame.MiniHelper.common().login();
    const player: string | undefined = login.gamePlayerId;
    const unsubscribe: () => void = MiniGame.HarmonyAccount.onAccountChanged((event) => {
        const generation: number = event.generation;
        void generation;
    });
    const switched: MiniGame.LoginResult = await MiniGame.HarmonyAccount.switchAccount();
    const role: MiniGame.HarmonyPlayerRole = { gamePlayerId: player || "", roleId: "0", roleName: "default" };
    await MiniGame.HarmonyAccount.reportRole(role);
    // @ts-expect-error 角色必须绑定已验证的游戏玩家。
    MiniGame.HarmonyAccount.reportRole({ roleId: "0", roleName: "default" });
    // @ts-expect-error SDK 角色字段要求字符串。
    MiniGame.HarmonyAccount.reportRole({ gamePlayerId: "p", roleId: 1, roleName: "default" });
    unsubscribe();
    void switched;
}
void harmonyAccountContract;
