export const HARMONY_ADS_PROTOCOL_VERSION: number = 1;

export type HarmonyAdAction = 'showReward' | 'showInterstitial';
export type HarmonyAdEventType = 'accepted' | 'opened' | 'rewarded' | 'closed' | 'error';

export interface HarmonyAdRequest {
  version: number;
  requestId: string;
  action: HarmonyAdAction;
  adId: string;
  placement?: string;
}

export interface HarmonyAdEvent {
  version: number;
  requestId: string;
  type: HarmonyAdEventType;
  code?: number | string;
  message?: string;
}

export function parseHarmonyAdRequest(requestJson: string): HarmonyAdRequest | null {
  try {
    const request = JSON.parse(requestJson) as HarmonyAdRequest;
    if (request.version !== HARMONY_ADS_PROTOCOL_VERSION ||
      typeof request.requestId !== 'string' ||
      (request.action !== 'showReward' && request.action !== 'showInterstitial') ||
      typeof request.adId !== 'string' ||
      request.adId.length === 0) {
      return null;
    }
    return request;
  } catch (_error) {
    return null;
  }
}
