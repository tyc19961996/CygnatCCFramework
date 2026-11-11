import { BaseCommon } from "../Base/BaseCommon";
import type { LoginResult } from "../interface/IMiniCommon";
import { Apk233Account } from "./Apk233Account";

export class Apk233Common extends BaseCommon {
    public login(): Promise<LoginResult> {
        return Apk233Account.login();
    }
}