import { getHarmonyAccountProtocolVersion, submitHarmonyAccountRequest, drainHarmonyAccountEvents } from '@cygnat/harmony-ads/Worker';

export function getProtocolVersion(_parameter: string): number { return getHarmonyAccountProtocolVersion(); }
export function submit(json: string): boolean { return submitHarmonyAccountRequest(json); }
export function drainEvents(_parameter: string): string { return drainHarmonyAccountEvents(); }
