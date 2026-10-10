import type common from '@ohos.app.ability.common';

export type HarmonyAccountInitializer = (context: common.UIAbilityContext) => Promise<void>;
interface PendingInitialization {
  context: common.UIAbilityContext | null;
  generation: number;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
  started: boolean;
}
let initializer: HarmonyAccountInitializer | null = null;
let disposer: (() => void) | null = null;
let pending: PendingInitialization | null = null;
let generation: number = 0;

function cancelPending(): void {
  generation++;
  const old = pending;
  pending = null;
  if (old !== null) {
    old.context = null;
    old.reject(new Error('鸿蒙账号初始化页面已失效'));
  }
}

function runPending(): void {
  const task = pending;
  const handler = initializer;
  if (task === null || handler === null || task.started || task.context === null) return;
  const context = task.context;
  task.context = null;
  task.started = true;
  console.info('[CygnatAccount] stage=lifecycle-dispatch');
  // 回调只持有本次任务；销毁或重建后不能交付旧初始化结果。
  const finish = (error: Error | null): void => {
    if (pending !== task || task.generation !== generation) return;
    pending = null;
    if (error === null) task.resolve();
    else task.reject(error);
  };
  try {
    handler(context).then(() => finish(null), (error: Error) => finish(error));
  } catch (error) {
    finish(error as Error);
  }
}

export function configureHarmonyAccountLifecycle(handler: HarmonyAccountInitializer, cleanup?: () => void): void {
  initializer = handler;
  disposer = cleanup ?? null;
  console.info('[CygnatAccount] stage=lifecycle-registered');
  runPending();
}

/** 只由页面加载成功回调登记；执行器晚注册时补执行，销毁后释放上下文。 */
export function getHarmonyAccountLifecycleGeneration(): number { return generation; }

export function initializeHarmonyAccountFromAbility(context: common.UIAbilityContext, expectedGeneration?: number): Promise<void> {
  console.info('[CygnatAccount] stage=ability-hook registered=' + (initializer !== null));
  if (expectedGeneration !== undefined && expectedGeneration !== generation) {
    return Promise.reject(new Error('鸿蒙账号页面加载回调已失效'));
  }
  if (pending !== null && pending.context === context) return pending.promise;
  cancelPending();
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((accept, decline) => { resolve = accept; reject = decline; });
  pending = { context, generation, promise, resolve, reject, started: false };
  runPending();
  return promise;
}

/** Ability 与页面共用取消边界；尚未加载 ETS 服务时也可清理待初始化上下文。 */
export function disposeHarmonyAccountFromAbility(): void {
  console.info('[CygnatAccount] stage=lifecycle-dispose');
  cancelPending();
  if (disposer !== null) disposer();
}
