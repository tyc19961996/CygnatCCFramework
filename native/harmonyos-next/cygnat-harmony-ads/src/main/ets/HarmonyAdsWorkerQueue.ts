import {
  HARMONY_ADS_PROTOCOL_VERSION,
  parseHarmonyAdRequest
} from './AdsProtocol';

export type HarmonyAdsRequestSender = (requestJson: string) => void;

export const MAX_QUEUED_EVENTS: number = 64;

let requestSender: HarmonyAdsRequestSender | null = null;
const queuedEvents: Array<string> = [];

export function configureHarmonyAdsWorker(sender: HarmonyAdsRequestSender): void {
  requestSender = sender;
}

export function getHarmonyAdsProtocolVersion(): number {
  return HARMONY_ADS_PROTOCOL_VERSION;
}

export function submitHarmonyAdRequest(requestJson: string): boolean {
  if (requestSender === null || parseHarmonyAdRequest(requestJson) === null) {
    return false;
  }
  requestSender(requestJson);
  return true;
}

export function enqueueHarmonyAdEvent(eventJson: string): void {
  if (typeof eventJson !== 'string' || eventJson.length === 0) {
    return;
  }
  if (queuedEvents.length >= MAX_QUEUED_EVENTS) {
    queuedEvents.shift();
  }
  queuedEvents.push(eventJson);
}

export function drainHarmonyAdEvents(): string {
  if (queuedEvents.length === 0) {
    return '[]';
  }
  const events = queuedEvents.splice(0, queuedEvents.length);
  return '[' + events.join(',') + ']';
}
