import {
  drainHarmonyAdEvents,
  getHarmonyAdsProtocolVersion,
  submitHarmonyAdRequest
} from '@cygnat/harmony-ads/Worker';

export function getProtocolVersion(_parameter: string): number {
  return getHarmonyAdsProtocolVersion();
}

export function submit(requestJson: string): boolean {
  return submitHarmonyAdRequest(requestJson);
}

export function drainEvents(_parameter: string): string {
  return drainHarmonyAdEvents();
}
