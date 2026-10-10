import { gamePlayer } from '@kit.GameServiceKit';
import { authentication } from '@kit.AccountKit';
import { common } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { util } from '@kit.ArkTS';
import { AccountEvent, AccountResult, parseAccountRequest } from './AccountProtocol';
import { configureHarmonyAccountLifecycle, initializeHarmonyAccountFromAbility, disposeHarmonyAccountFromAbility } from './HarmonyAccountLifecycle';

export type AccountSendToWorker = (json: string) => void;

class AccountFailure extends Error {
  public code: number;
  constructor(code: number) {
    super('鸿蒙账号操作失败');
    this.code = code;
  }
}

/** 只在 UIAbility 页面加载完成后初始化；Worker 不加载任何 ETS SDK。 */
export class HarmonyAccountService {
  private initialization: Promise<void> | null = null;
  private ready: boolean = false;
  private initializationStarted: boolean = false;
  private listening: boolean = false;
  private generation: number = 0;
  private player: string = '';
  private busy: boolean = false;
  private sendToWorker: AccountSendToWorker | null = null;
  private pendingId: string = '';
  private settled: boolean = false;
  private timer: number = -1;
  private disposed: boolean = false;
  private lifecycle: number = 0;
  private operation: Promise<void> | null = null;
  private releaseOperation: (() => void) | null = null;
  private handledIds: Array<string> = [];
  private initializationWaiter: (() => void) | null = null;
  private onPlayerChanged = (_result: gamePlayer.PlayerChangedResult): void => {
    this.generation++;
    this.player = '';
    const event: AccountEvent = { version: 1, type: 'accountChanged', generation: this.generation };
    this.send(event);
    if (this.busy) this.fail(-98005, '鸿蒙账号已变化，请清理会话后重试');
  };

  public initialize(context: common.UIAbilityContext, sendToWorker?: AccountSendToWorker): Promise<void> {
    console.info('[CygnatAccount] stage=service-initialize started=' + this.initializationStarted + ' disposed=' + this.disposed + ' busy=' + this.busy);
    if (sendToWorker) this.sendToWorker = sendToWorker;
    if (this.disposed) {
      if (this.busy && this.operation !== null) {
        const lifecycle = this.lifecycle;
        return this.operation.then(() => {
          if (lifecycle !== this.lifecycle) throw this.error(-98005);
          return this.initialize(context, sendToWorker);
        });
      }
      this.initialization = null;
    }
    if (this.initialization) return this.initialization;
    this.disposed = false;
    this.initializationStarted = true;
    this.initialization = this.init(context, this.generation);
    this.resumeInitializationWaiter();
    return this.initialization;
  }

  private async init(context: common.UIAbilityContext, generation: number): Promise<void> {
    try {
      console.info('[CygnatAccount] stage=sdk-init-enter');
      await gamePlayer.init(context);
      console.info('[CygnatAccount] stage=sdk-init-complete');
      if (this.disposed || generation !== this.generation) return;
      gamePlayer.on('playerChanged', this.onPlayerChanged);
      this.listening = true;
      this.ready = true;
    } catch (error) {
      const code = (error as BusinessError).code;
      console.info('[CygnatAccount] stage=sdk-init-failed code=' + (typeof code === 'number' ? code : -98002));
      if (generation === this.generation) this.initialization = null;
      throw error as Error;
    }
  }

  public async handleRequest(context: common.UIAbilityContext, json: string, sendToWorker: AccountSendToWorker): Promise<void> {
    const request = parseAccountRequest(json);
    if (request === null) return;
    console.info('[CygnatAccount] stage=request started=' + this.initializationStarted + ' initialized=' + (this.initialization !== null) + ' ready=' + this.ready + ' disposed=' + this.disposed);
    this.sendToWorker = sendToWorker;
    if (this.handledIds.indexOf(request.requestId) >= 0) return;
    this.handledIds.push(request.requestId);
    if (this.handledIds.length > 128) this.handledIds.shift();
    if (this.busy) {
      const result: AccountResult = { success: false, code: '', errCode: -98003, errMsg: '官方账号操作尚未结束' };
      const event: AccountEvent = { version: 1, type: 'result', requestId: request.requestId, result };
      this.send(event);
      return;
    }
    this.busy = true;
    this.operation = new Promise<void>((resolve) => { this.releaseOperation = resolve; });
    this.pendingId = request.requestId;
    this.settled = false;
    const generation = this.generation;
    this.timer = setTimeout(() => {
      if (this.busy && this.pendingId === request.requestId) this.fail(-98004, '鸿蒙账号操作超时');
    }, 120000);
    try {
      // 仅在 UIAbility 已成功加载页面的边界之后，响应用户显式重试初始化。
      // 请求可早于页面成功回调；只等待该合法边界，不以请求上下文启动 SDK。
      if (this.initialization === null && !this.initializationStarted && !this.disposed) {
        await new Promise<void>((resolve) => { this.initializationWaiter = resolve; });
      }
      if (!this.active(generation)) throw this.error(-98005);
      if (this.initialization === null && this.initializationStarted && !this.disposed) await this.initialize(context);
      if (this.initialization === null) throw this.error(-98007);
      await this.initialization;
      if (!this.ready || !this.active(generation)) throw this.error(-98005);
      if (request.action === 'reportRole') {
        const role = request.role;
        if (!role || !this.player || role.gamePlayerId !== this.player) throw this.error(-98006);
        const info: gamePlayer.GSKPlayerRole = {
          gamePlayerId: role.gamePlayerId, roleId: role.roleId, roleName: role.roleName,
          serverId: role.serverId, serverName: role.serverName,
        };
        await gamePlayer.savePlayerRole(context, info);
        if (this.active(generation)) this.complete({ success: true, code: '' });
        return;
      }
      this.player = '';
      const login = await gamePlayer.unionLogin(context, { showLoginDialog: request.action === 'switchAccount', thirdAccountInfos: [] });
      if (!this.active(generation)) return;
      if (login.accountName !== 'hw_account' || !login.localPlayer || !login.localPlayer.gamePlayerId) throw this.error(-98002);
      const requestCode = new authentication.HuaweiIDProvider().createLoginWithHuaweiIDRequest();
      requestCode.state = util.generateRandomUUID();
      requestCode.forceLogin = false;
      const controller = new authentication.AuthenticationController(context);
      const response = await controller.executeRequest(requestCode) as authentication.LoginWithHuaweiIDResponse;
      if (!this.active(generation)) return;
      if (!response.state || response.state !== requestCode.state) throw this.error(-98008);
      const code = response.data?.authorizationCode;
      if (!code) throw this.error(-98002);
      await gamePlayer.verifyLocalPlayer(context, { thirdOpenId: '' });
      if (!this.active(generation)) return;
      this.player = login.localPlayer.gamePlayerId;
      this.complete({ success: true, code, gamePlayerId: this.player });
    } catch (error) {
      const businessError = error as BusinessError;
      const code = typeof businessError.code === 'number' ? businessError.code : -98002;
      this.fail(code, this.message(code));
    } finally {
      if (this.timer !== -1) clearTimeout(this.timer);
      this.timer = -1;
      this.busy = false;
      this.pendingId = '';
      const release = this.releaseOperation;
      this.releaseOperation = null;
      this.operation = null;
      if (release !== null) release();
    }
  }

  public dispose(): void {
    console.info('[CygnatAccount] stage=service-dispose');
    this.disposed = true;
    this.lifecycle++;
    this.generation++;
    this.player = '';
    this.fail(-98005, '鸿蒙登录页面已销毁');
    if (this.listening) {
      try { gamePlayer.off('playerChanged', this.onPlayerChanged); } catch { /* 清理失败不能交付旧凭据。 */ }
    }
    this.listening = false;
    this.ready = false;
    this.sendToWorker = null;
  }

  private active(generation: number): boolean { return !this.disposed && !this.settled && generation === this.generation; }
  private error(code: number): AccountFailure { return new AccountFailure(code); }
  private message(code: number): string {
    if (code === 1002000016 || code === 1001502012 || code === 1002000004) return '用户取消鸿蒙登录或实名认证';
    if (code === 1002000002 || code === 1001502005) return '鸿蒙账号网络连接失败';
    if (code === -98007) return '原生账号服务尚未初始化，请重新启动游戏';
    if (code === 1002000017 || code === 1001500001 || code === 1001502014 || code === 401) return '请检查鸿蒙 App ID、Client ID、指纹与服务配置';
    return '鸿蒙账号操作失败，请检查错误码';
  }
  private fail(code: number, message: string): void {
    this.player = '';
    this.complete({ success: false, code: '', errCode: code, errMsg: message });
    this.resumeInitializationWaiter();
  }
  private resumeInitializationWaiter(): void {
    const resume = this.initializationWaiter;
    this.initializationWaiter = null;
    if (resume !== null) resume();
  }
  private complete(result: AccountResult): void {
    if (!this.busy || this.settled || !this.pendingId) return;
    this.settled = true;
    const event: AccountEvent = { version: 1, type: 'result', requestId: this.pendingId, result };
    this.send(event);
  }
  private send(event: AccountEvent): void {
    try { if (this.sendToWorker !== null) this.sendToWorker(JSON.stringify(event)); } catch { /* Worker 销毁时丢弃凭据，不记录敏感内容。 */ }
  }
}

const service = new HarmonyAccountService();
configureHarmonyAccountLifecycle((context: common.UIAbilityContext): Promise<void> => service.initialize(context), () => service.dispose());
export function initializeHarmonyAccount(context: common.UIAbilityContext, generation?: number): Promise<void> { return initializeHarmonyAccountFromAbility(context, generation); }
export function handleHarmonyAccountRequest(context: common.UIAbilityContext, json: string, send: AccountSendToWorker): void {
  service.handleRequest(context, json, send).catch(() => {});
}
export function disposeHarmonyAccount(): void { disposeHarmonyAccountFromAbility(); }
