import { parseAccountRequest } from './AccountProtocol';

let sender: ((json: string) => void) | null = null;
const events: Array<string> = [];

export function configureHarmonyAccountWorker(send: (json: string) => void): void { sender = send; }
export function getHarmonyAccountProtocolVersion(): number { return 1; }
export function submitHarmonyAccountRequest(json: string): boolean {
  if (sender === null || parseAccountRequest(json) === null) return false;
  sender(json);
  return true;
}
export function enqueueHarmonyAccountEvent(json: string): void {
  if (typeof json !== 'string' || !json) return;
  if (events.length >= 64) events.shift();
  events.push(json);
}
export function drainHarmonyAccountEvents(): string {
  const result = '[' + events.join(',') + ']';
  events.splice(0, events.length);
  return result;
}
