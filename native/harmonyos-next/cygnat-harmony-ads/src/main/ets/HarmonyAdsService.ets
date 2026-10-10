import { common } from '@kit.AbilityKit';
import { advertising } from '@kit.AdsKit';
import { BusinessError, commonEventManager } from '@kit.BasicServicesKit';
import {
  HARMONY_ADS_PROTOCOL_VERSION,
  HarmonyAdEvent,
  HarmonyAdEventType,
  HarmonyAdRequest,
  parseHarmonyAdRequest
} from './AdsProtocol';

const REWARD_AD_TYPE: number = 7;
const INTERSTITIAL_AD_TYPE: number = 12;
const REWARD_STATUS_EVENT: string = 'com.huawei.hms.pps.action.PPS_REWARD_STATUS_CHANGED';
const INTERSTITIAL_STATUS_EVENT: string = 'com.huawei.hms.pps.action.PPS_INTERSTITIAL_STATUS_CHANGED';
const REWARD_STATUS_KEY: string = 'reward_ad_status';
const INTERSTITIAL_STATUS_KEY: string = 'interstitial_ad_status';
const ADS_SERVICE_BUNDLE: string = 'com.huawei.hms.adsservice';
const NATIVE_REQUEST_TIMEOUT_MS: number = 175000;
const ERROR_TIMEOUT: number = -97006;
const ERROR_BUSY: number = -97003;
const ERROR_INVALID_REQUEST: number = -97005;
const ERROR_EMPTY_AD: number = 21800003;
const ERROR_DISPOSED: number = -97007;

export type HarmonyAdsSendToWorker = (eventJson: string) => void;

interface HarmonyActiveRequest {
  request: HarmonyAdRequest;
  sendToWorker: HarmonyAdsSendToWorker;
  statusKey: string;
  subscriber: commonEventManager.CommonEventSubscriber | null;
  phase: 'loading' | 'showing' | 'opened';
  watchdog: number | null;
  timedOut: boolean;
}

/**
 * Ads Kit 主线程服务。宿主只注入 UIAbilityContext 与 Worker 消息发送函数。
 */
export class HarmonyAdsService {
  private activeRequest: HarmonyActiveRequest | null = null;

  public handleRequest(
    context: common.UIAbilityContext,
    requestJson: string,
    sendToWorker: HarmonyAdsSendToWorker
  ): void {
    const request = parseHarmonyAdRequest(requestJson);
    if (request === null) {
      return;
    }
    if (request.version !== HARMONY_ADS_PROTOCOL_VERSION) {
      this.trySendEvent(sendToWorker, request.requestId, 'error', ERROR_INVALID_REQUEST, '鸿蒙广告协议版本不匹配');
      return;
    }
    if (this.activeRequest !== null) {
      this.trySendEvent(sendToWorker, request.requestId, 'error', ERROR_BUSY, '已有全屏广告请求正在处理');
      return;
    }

    const active: HarmonyActiveRequest = {
      request: request,
      sendToWorker: sendToWorker,
      statusKey: request.action === 'showReward' ? REWARD_STATUS_KEY : INTERSTITIAL_STATUS_KEY,
      subscriber: null,
      phase: 'loading',
      watchdog: null,
      timedOut: false
    };
    this.activeRequest = active;
    if (!this.trySendEvent(sendToWorker, request.requestId, 'accepted')) {
      this.clearActive(request.requestId);
      return;
    }
    active.watchdog = setTimeout((): void => {
      this.handleWatchdog(request.requestId);
    }, NATIVE_REQUEST_TIMEOUT_MS);

    try {
      this.registerStatusSubscriber(active);
      this.loadAd(context, active);
    } catch (error) {
      const businessError = error as BusinessError;
      this.failActive(
        request.requestId,
        businessError.code || ERROR_EMPTY_AD,
        businessError.message || '鸿蒙广告初始化失败'
      );
    }
  }

  public dispose(): void {
    const active = this.activeRequest;
    if (active === null) {
      return;
    }
    this.clearActive(active.request.requestId);
    this.trySendEvent(
      active.sendToWorker,
      active.request.requestId,
      'error',
      ERROR_DISPOSED,
      '鸿蒙广告服务已销毁'
    );
  }

  private registerStatusSubscriber(active: HarmonyActiveRequest): void {
    const eventName = active.request.action === 'showReward'
      ? REWARD_STATUS_EVENT
      : INTERSTITIAL_STATUS_EVENT;
    const subscribeInfo: commonEventManager.CommonEventSubscribeInfo = {
      events: [eventName],
      publisherBundleName: 'com.huawei.hms.adsservice'
    };
    const subscriber = commonEventManager.createSubscriberSync(subscribeInfo);
    active.subscriber = subscriber;

    commonEventManager.subscribe(
      subscriber,
      (error: BusinessError, data: commonEventManager.CommonEventData): void => {
        if (error && error.code) {
          this.failActive(active.request.requestId, error.code, error.message);
          return;
        }
        if (data === undefined || data.parameters === undefined) {
          return;
        }
        const status: string = data.parameters[active.statusKey] as string;
        if (typeof status === 'string') {
          this.handleStatus(active.request.requestId, status);
        }
      }
    );
  }

  private loadAd(context: common.UIAbilityContext, active: HarmonyActiveRequest): void {
    const loader = new advertising.AdLoader(context);
    const listener: advertising.AdLoadListener = {
      onAdLoadFailure: (errorCode: number, errorMsg: string): void => {
        this.failActive(active.request.requestId, errorCode, errorMsg);
      },
      onAdLoadSuccess: (ads: Array<advertising.Advertisement>): void => {
        if (!this.isActive(active.request.requestId)) {
          return;
        }
        if (ads.length === 0) {
          this.failActive(active.request.requestId, ERROR_EMPTY_AD, 'Ads Kit 未返回广告素材');
          return;
        }
        active.phase = 'showing';
        try {
          advertising.showAd(ads[0], {}, context);
        } catch (error) {
          const businessError = error as BusinessError;
          this.failActive(
            active.request.requestId,
            businessError.code || ERROR_EMPTY_AD,
            businessError.message || '鸿蒙广告展示失败'
          );
        }
      }
    };
    const adParam: advertising.AdRequestParams = {
      adId: active.request.adId,
      adType: active.request.action === 'showReward' ? REWARD_AD_TYPE : INTERSTITIAL_AD_TYPE
    };
    loader.loadAd(adParam, {}, listener);
  }

  private handleWatchdog(requestId: string): void {
    const active = this.activeRequest;
    if (active === null || active.request.requestId !== requestId) {
      return;
    }
    active.watchdog = null;
    if (active.phase === 'loading') {
      this.failActive(requestId, ERROR_TIMEOUT, '鸿蒙原生广告请求超时');
      return;
    }
    active.timedOut = true;
    this.trySendEvent(active.sendToWorker, requestId, 'error', ERROR_TIMEOUT, '鸿蒙原生广告请求超时');
  }

  private handleStatus(requestId: string, status: string): void {
    const active = this.activeRequest;
    if (active === null || active.request.requestId !== requestId) {
      return;
    }

    switch (status) {
      case 'onAdOpen':
        if (active.phase !== 'showing') {
          break;
        }
        active.phase = 'opened';
        if (!active.timedOut && !this.trySendEvent(active.sendToWorker, requestId, 'opened')) {
          active.timedOut = true;
        }
        break;
      case 'onAdReward':
        if (active.request.action === 'showReward' && active.phase === 'opened' && !active.timedOut) {
          if (!this.trySendEvent(active.sendToWorker, requestId, 'rewarded')) {
            active.timedOut = true;
          }
        }
        break;
      case 'onAdClose':
        if (active.timedOut) {
          this.clearActive(requestId);
          break;
        }
        if (active.phase !== 'opened') {
          break;
        }
        this.clearActive(requestId);
        this.trySendEvent(active.sendToWorker, requestId, 'closed');
        break;
      case 'onAdFail':
        if (active.phase === 'loading') {
          break;
        }
        if (active.timedOut) {
          this.clearActive(requestId);
        } else {
          this.failActive(requestId, ERROR_EMPTY_AD, 'Ads Kit 广告状态通知失败');
        }
        break;
      default:
        break;
    }
  }

  private failActive(requestId: string, code: number, message: string): void {
    const active = this.activeRequest;
    if (active === null || active.request.requestId !== requestId) {
      return;
    }
    this.clearActive(requestId);
    this.trySendEvent(active.sendToWorker, requestId, 'error', code, message);
  }

  private clearActive(requestId: string): void {
    const active = this.activeRequest;
    if (active === null || active.request.requestId !== requestId) {
      return;
    }
    this.activeRequest = null;
    if (active.watchdog !== null) {
      clearTimeout(active.watchdog);
      active.watchdog = null;
    }
    if (active.subscriber !== null) {
      try {
        commonEventManager.unsubscribe(active.subscriber);
      } catch (_error) {
        console.error('[CygnatHarmonyAds] 公共事件退订失败');
      }
    }
  }

  private isActive(requestId: string): boolean {
    return this.activeRequest !== null && this.activeRequest.request.requestId === requestId;
  }

  private trySendEvent(
    sendToWorker: HarmonyAdsSendToWorker,
    requestId: string,
    type: HarmonyAdEventType,
    code?: number | string,
    message?: string
  ): boolean {
    const event: HarmonyAdEvent = {
      version: HARMONY_ADS_PROTOCOL_VERSION,
      requestId: requestId,
      type: type,
      code: code,
      message: message
    };
    try {
      sendToWorker(JSON.stringify(event));
      return true;
    } catch (_error) {
      console.error('[CygnatHarmonyAds] Worker 事件发送失败');
      return false;
    }
  }
}

const harmonyAdsService: HarmonyAdsService = new HarmonyAdsService();

export function handleHarmonyAdRequest(
  context: common.UIAbilityContext,
  requestJson: string,
  sendToWorker: HarmonyAdsSendToWorker
): void {
  harmonyAdsService.handleRequest(context, requestJson, sendToWorker);
}

export function disposeHarmonyAds(): void {
  harmonyAdsService.dispose();
}
