import { BaseCommon } from "../Base/BaseCommon";
import { LoginResult } from "../interface/IMiniCommon";
import { HarmonyAccount } from "./HarmonyAccount";

export class HarmonyCommon extends BaseCommon {
    public login(force = false): Promise<LoginResult> {
        return force ? HarmonyAccount.switchAccount() : HarmonyAccount.login();
    }
}
