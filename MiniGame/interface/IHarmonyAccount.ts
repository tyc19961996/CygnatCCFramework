/** 鸿蒙角色信息；仅在服务器绑定当前账号与角色后上报。 */
export interface HarmonyPlayerRole {
    gamePlayerId: string;
    roleId: string;
    roleName: string;
    serverId?: string;
    serverName?: string;
}

/** 账号已失效；不携带旧玩家、凭据或存档数据。 */
export interface HarmonyAccountChangedEvent {
    generation: number;
}

export enum HarmonyAccountErrorCode {
    Unavailable = -98001,
    InvalidResponse = -98002,
    Busy = -98003,
    Timeout = -98004,
    AccountChanged = -98005,
    InvalidRole = -98006,
    Configuration = -98007,
    StateMismatch = -98008,
}
