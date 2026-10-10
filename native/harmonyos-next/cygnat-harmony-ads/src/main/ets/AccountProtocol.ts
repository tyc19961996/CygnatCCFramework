export interface AccountRole {
  gamePlayerId: string;
  roleId: string;
  roleName: string;
  serverId?: string;
  serverName?: string;
}

export interface AccountRequest {
  version: number;
  requestId: string;
  action: string;
  role?: AccountRole;
}

export interface AccountResult {
  success: boolean;
  code: string;
  gamePlayerId?: string;
  errCode?: number;
  errMsg?: string;
}

export interface AccountEvent {
  version: number;
  type: string;
  requestId?: string;
  generation?: number;
  result?: AccountResult;
}

export function parseAccountRequest(json: string): AccountRequest | null {
  try {
    const request = JSON.parse(json) as AccountRequest;
    if (request.version !== 1 || typeof request.requestId !== 'string' || !request.requestId || request.requestId.length > 128) return null;
    if (request.action !== 'login' && request.action !== 'switchAccount' && request.action !== 'reportRole') return null;
    if (request.action === 'reportRole') {
      const role = request.role;
      if (!role || typeof role.gamePlayerId !== 'string' || !role.gamePlayerId ||
        typeof role.roleId !== 'string' || !role.roleId.trim() || typeof role.roleName !== 'string' || !role.roleName.trim() ||
        (role.serverId !== undefined && typeof role.serverId !== 'string') ||
        (role.serverName !== undefined && typeof role.serverName !== 'string')) return null;
    }
    return request;
  } catch { return null; }
}
