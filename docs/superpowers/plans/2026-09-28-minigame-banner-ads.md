# MiniGame Banner 广告接入实施计划

> **给代理执行者：** 按任务顺序执行本计划。每一步使用复选框跟踪；本仓库要求新增文档、注释和 Git 记录使用中文，未得到宿主提交指示前不要创建提交。

**目标：** 在保持已有激励/插屏广告兼容的前提下，为 MiniGame 广告层增加 Banner 的统一初始化、显示、隐藏、销毁、尺寸和错误监听，并实现微信、支付宝、Bilibili、快手、字节跳动及 OPPO 六个平台适配。

**架构：** 在 `IMiniAds.ts` 增加 `IMiniBannerAds` 与跨平台安全的 Banner 类型，令现有 `IMiniRewardAds` 继承 Banner 能力。`BaseAds` 负责惰性创建、Promise/事件兼容、回调去重、错误归一化和幂等清理；六个平台类只实现自己的 `createBannerAd` 钩子并使用各自的全局 API。平台声明文件补齐最小 Banner 类型，公共索引继续只从包根命名空间导出。

**技术栈：** TypeScript 5、Cocos Creator 3.x 宿主声明、Node.js `node:test`、TypeScript `transpileModule` 测试 stub、现有 `npm test/build/pack:check` 脚本。

---

## 文件结构

### 新建

- `tests/minigame-banner.test.mjs`：Banner 基类生命周期、错误/尺寸回调及六个平台源码接入回归。
- `tests/minigame-banner.typecheck.ts`：公共 Banner 类型和根入口调用契约。
- `docs/superpowers/specs/2026-09-28-minigame-banner-ads-design.md`：已确认的设计说明。
- `docs/superpowers/plans/2026-09-28-minigame-banner-ads.md`：本实施计划。

### 修改

- `MiniGame/interface/IMiniAds.ts`：配置、样式、回调、监听器和 Banner 接口。
- `MiniGame/Base/BaseAds.ts`：Banner 状态、惰性创建、事件绑定和清理。
- `MiniGame/MiniHelper.ts`：仅保留现有泛型入口，验证返回对象包含 Banner 能力。
- `MiniGame/index.ts`：导出新增公共类型。
- `MiniGame/wechat/WechatAds.ts`、`MiniGame/alipay/AlipayAds.ts`、`MiniGame/bilibili/BilibiliAds.ts`、`MiniGame/kuaishou/KuaiShouAds.ts`、`MiniGame/bytedance/BytedanceAds.ts`、`MiniGame/oppo/OppoAds.ts`：增加平台 Banner 创建钩子与第三泛型。
- `MiniGame/types/lib.wx.api.d.ts`、`lib.ali.api.d.ts`、`lib.bilibili.api.d.ts`、`lib.kuaishou.api.d.ts`、`lib.bytedance.api.d.ts`、`lib.oppo.api.d.ts`：增加 Banner 实例、创建参数和全局创建方法。
- `AGENTS.md`：完成后在“当前状态与变更记忆”顶部追加中文记录。

---

## 任务 1：建立失败测试与公共调用样例

**目标：** 先证明当前源码缺少 Banner 公共契约、基类行为和六个平台入口；不写生产实现。

**文件：**

- Create: `tests/minigame-banner.typecheck.ts`
- Create: `tests/minigame-banner.test.mjs`

- [ ] **步骤 1：写类型契约红灯测试。** 创建以下最小调用，要求当前 TypeScript 检查因缺少字段/方法而失败：

```ts
import {
    IMiniBannerAds,
    IMiniBannerAdsListener,
    IMiniRewardAdInitConfig,
    IMiniShowBannerAdOptions,
    MiniBannerAdCallback,
    MiniBannerAdSize,
    IMiniRewardAds,
    MiniHelper,
} from "../MiniGame";

const config: IMiniRewardAdInitConfig = {
    bannerAdId: "banner-id",
};
const options: IMiniShowBannerAdOptions = {
    adIntervals: 30,
    style: { left: 0, top: 640, width: 320, height: 100 },
};
const callback: MiniBannerAdCallback = {
    success: () => undefined,
    fail: (code: number, message: string) => `${code}:${message}`,
};
const listener: IMiniBannerAdsListener = {
    onShow: () => undefined,
    onClose: () => undefined,
    onResize: (size: MiniBannerAdSize) => size.width + size.height,
    onError: (code: number, message: string) => `${code}:${message}`,
};

const ads: IMiniRewardAds = MiniHelper.ad();
const bannerAds: IMiniBannerAds = ads;
ads.init(config);
bannerAds.setBannerAdsListener(listener);
bannerAds.showBannerAd(options, callback);
bannerAds.hideBannerAd();
bannerAds.destroyBannerAd();
```

- [ ] **步骤 2：写基类行为红灯测试。** 在 `tests/minigame-banner.test.mjs` 用 `typescript.transpileModule` 加载 `BaseAds.ts`，替换接口导入为最小 stub，定义 `TestAds extends BaseAds` 覆盖 `createBannerAd(options)` 返回可控 fake：

```js
const banner = {
    style: {},
    onLoad(callback) { this.load = callback; },
    onError(callback) { this.error = callback; },
    onResize(callback) { this.resize = callback; },
    onClose(callback) { this.close = callback; },
    show() { this.showCalls++; return Promise.resolve(); },
    hide() { this.hideCalls++; },
    destroy() { this.destroyCalls++; },
    showCalls: 0,
    hideCalls: 0,
    destroyCalls: 0,
};
```

断言 `init({ bannerAdId })` 不立即创建，首次 `showBannerAd` 创建一次并传入 `style/adIntervals`；Promise resolve 触发一次 `success/onShow`；`resize` 透传尺寸；`hideBannerAd` 可重复调用；`destroyBannerAd` 清空实例且可重复调用；错误对象 `{ errorCode, errorMessage }` 只触发一次 `fail/onError`。

- [ ] **步骤 3：写六平台源码红灯断言。** 对每个平台源码与声明文件增加断言：源码包含对应 `createBannerAd`，声明包含 `BannerAd` 和 `createBannerAd`。断言应在当前代码上失败，说明红灯来自缺失能力而非测试拼写错误。

- [ ] **步骤 4：运行红灯。** 执行：

```powershell
node --test tests/minigame-banner.test.mjs
npx tsc -p tsconfig.json --noEmit
```

预期：Node 测试至少有基类/平台断言失败，TypeScript 报告 Banner 类型或方法不存在。若出现测试脚本自身语法错误，先修正测试，不修改生产代码。

---

## 任务 2：实现公共类型与 `BaseAds` Banner 生命周期

**目标：** 让任务 1 的基类和类型测试转绿，同时不改变旧激励/插屏路径。

**文件：**

- Modify: `MiniGame/interface/IMiniAds.ts`
- Modify: `MiniGame/Base/BaseAds.ts`
- Modify: `MiniGame/index.ts`

- [ ] **步骤 1：增加公共类型。** 在 `IMiniAds.ts` 保留原有枚举和类型，追加：

```ts
export interface MiniBannerAdStyle {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
}

export interface IMiniShowBannerAdOptions {
    style?: MiniBannerAdStyle;
    adIntervals?: number;
}

export type IMiniBannerAdOptions = IMiniShowBannerAdOptions;

export interface MiniBannerAdSize { width: number; height: number; }

export interface MiniBannerAdCallback {
    success?: () => void;
    fail?: (errCode: number, errMsg: string) => void;
}

export interface IMiniBannerAdsListener {
    onShow?: () => void;
    onClose?: () => void;
    onResize?: (size: MiniBannerAdSize) => void;
    onError?: (errCode: number, errMsg: string) => void;
}

export interface IMiniBannerAds {
    showBannerAd(options?: IMiniShowBannerAdOptions, res?: MiniBannerAdCallback): void;
    hideBannerAd(): void;
    destroyBannerAd(): void;
    setBannerAdsListener(listener: IMiniBannerAdsListener): void;
}
```

将 `bannerAdId?: string` 加入 `IMiniRewardAdInitConfig`，并令 `IMiniRewardAds extends IMiniBannerAds`。为兼容便捷调用，`init` 增加可选第三参数 `bannerAdUnitId?: string`，旧两参数调用保持有效。

- [ ] **步骤 2：扩展 BaseAds 状态。** 将类签名改为 `BaseAds<T, B, C = any>`，新增 `_bannerAdUnitId`、`_bannerAd`、`_bannerOptions`、`_bannerListener`、`_bannerSuccess`、`_bannerFail` 和一次性结算标志。不要重命名现有 reward/interstitial 字段。

- [ ] **步骤 3：修正配置归一化。** `normalizeInitConfig` 对字符串返回 `bannerAdId: bannerAdUnitId`；对象返回时保留 `appId`、`isDebug` 和 `bannerAdId`，并将 `defaultRewardAdId/rewardAdIds/interstitialAdId` 的旧逻辑原样保留。

- [ ] **步骤 4：实现惰性创建和创建参数。** 在 `BaseAds` 增加：

```ts
protected createBannerAd(_options?: IMiniShowBannerAdOptions): C { return null; }
protected getBannerCreateOptions(options?: IMiniShowBannerAdOptions): {
    adUnitId: string;
    style?: MiniBannerAdStyle;
    adIntervals?: number;
} {
    const result: any = { adUnitId: this._bannerAdUnitId };
    if (options?.style) result.style = { ...options.style };
    if (options?.adIntervals !== undefined) result.adIntervals = options.adIntervals;
    return result;
}
```

`showBannerAd` 首次调用才执行 `createBannerAd`; 如果后续调用的 `adIntervals` 与已创建实例不一致，先销毁旧实例再按新参数创建。样式字段在实例存在且有 `style` 时同步写入，但不把平台私有字段写入公共对象。

- [ ] **步骤 5：绑定事件和统一回调。** 用 `any` 读取宿主可选方法，按以下规则实现：

  - `onError` 调用 `fail`、`listener.onError`，错误码/消息按 `errCode -> errorCode -> code` 与 `errMsg -> errorMessage -> msg` 顺序读取，缺失回退 `MiniErrorCode.AD_NOT_INIT`。
  - `onResize` 仅在宽高为数字时调用 `listener.onResize({ width, height })`。
  - `onClose` 调用 `listener.onClose`，不触发成功回调。
  - `show()` 返回 Promise 时 resolve 调用 `success` 和 `listener.onShow`，reject 走统一错误；返回非 Promise 时立即视为成功。
  - 同一 `showBannerAd` 请求用 `_bannerCallbackSettled` 防止 `onError` 与 Promise reject 双回调；完成/失败后清理业务回调但保留实例。

- [ ] **步骤 6：实现隐藏、销毁和监听器。** `hideBannerAd` 在实例和 `hide` 存在时调用并吞掉同步异常；`destroyBannerAd` 调用 `hide`（若存在）和 `destroy`（若存在），清空实例、选项与回调，重复调用不抛错；`setBannerAdsListener` 接受 `null` 并安全清除。

- [ ] **步骤 7：导出类型并跑局部绿灯。** `MiniGame/index.ts` 导出所有新增接口、类型别名和 `MiniBannerAdStyle`。执行：

```powershell
node --test tests/minigame-banner.test.mjs
npx tsc -p tsconfig.json --noEmit
```

预期：基类行为与类型契约通过；平台源码断言仍可能失败。

---

## 任务 3：补齐六个平台类型声明

**目标：** 让每个平台的创建钩子有可编译的最小宿主类型，且只声明实际使用的成员。

**文件：**

- Modify: `MiniGame/types/lib.wx.api.d.ts`
- Modify: `MiniGame/types/lib.ali.api.d.ts`
- Modify: `MiniGame/types/lib.bilibili.api.d.ts`
- Modify: `MiniGame/types/lib.kuaishou.api.d.ts`
- Modify: `MiniGame/types/lib.bytedance.api.d.ts`
- Modify: `MiniGame/types/lib.oppo.api.d.ts`

- [ ] **步骤 1：在六个命名空间中增加共同形状。** 每个平台声明自己的 `BannerAdStyle`、`BannerAdErrorEvent`、`BannerAd` 和 `CreateBannerAdOption`（支付宝沿用已有全局 `My` 接口风格）。实例至少声明 `show/hide/destroy`、可选 `style`、`onLoad/onError/onResize/onClose`；`show/hide` 的返回值使用 `Promise<any> | void` 以兼容宿主版本。

- [ ] **步骤 2：增加全局创建方法。** 分别在 `Wx`、`My`、`BL`、`KS`、`TT`、`QG` 增加 `createBannerAd`；Bilibili、字节、OPPO 对创建方法标记可选，运行时由适配器检查函数存在。

- [ ] **步骤 3：只声明适配器实际传递的字段。** 创建参数包含 `adUnitId`、可选 `style` 和可选 `adIntervals`；不加入其他平台私有参数。错误事件允许 `errCode/errorCode/code` 和 `errMsg/errorMessage/msg` 的可选组合。

- [ ] **步骤 4：运行类型检查。** 执行 `npx tsc -p tsconfig.json --noEmit`；预期声明无重复冲突，任务 2 的类型测试仍保持通过。

---

## 任务 4：逐个平台实现 Banner 创建钩子

**目标：** 每个平台类都使用对应全局 API，公共生命周期由 `BaseAds` 复用。

**文件：**

- Modify: `MiniGame/wechat/WechatAds.ts`
- Modify: `MiniGame/alipay/AlipayAds.ts`
- Modify: `MiniGame/bilibili/BilibiliAds.ts`
- Modify: `MiniGame/kuaishou/KuaiShouAds.ts`
- Modify: `MiniGame/bytedance/BytedanceAds.ts`
- Modify: `MiniGame/oppo/OppoAds.ts`

- [ ] **步骤 1：更新泛型与导入。** 各类继承改为 `BaseAds<RewardType, InterstitialType, BannerType>`；从 `IMiniAds` 导入 `IMiniShowBannerAdOptions`。Alipay 的 `any` 插屏保持不变。

- [ ] **步骤 2：实现微信。** 在 `WechatAds` 增加：

```ts
protected createBannerAd(options: IMiniShowBannerAdOptions): WechatMiniprogram.BannerAd {
    if (!wx.createBannerAd || !this._bannerAdUnitId) return null;
    return wx.createBannerAd(this.getBannerCreateOptions(options));
}
```

不在微信类重复实现 show/hide/error，确保 Base 的统一回调负责生命周期。

- [ ] **步骤 3：实现支付宝。** 使用 `my.createBannerAd`，先检查函数和广告位 ID；将 `getBannerCreateOptions` 结果传入，兼容支付宝 Banner 实例没有某个可选事件方法的情况。

- [ ] **步骤 4：实现 Bilibili、快手和字节。** 分别调用 `bl.createBannerAd`、`ks.createBannerAd`、`tt.createBannerAd`；每个方法先判断全局创建函数存在，缺失直接返回 `null` 让 Base 触发统一失败。

- [ ] **步骤 5：实现 OPPO。** 在 `OppoAds` 增加 `qg.createBannerAd` 钩子，兼容 OPPO 旧声明中只有 `onShow/onError` 的实例；不把 OPPO 的应用级 `initAdService` 参数传给 Banner 创建函数。

- [ ] **步骤 6：运行平台源码和类型断言。** 执行：

```powershell
node --test tests/minigame-banner.test.mjs
npx tsc -p tsconfig.json --noEmit
```

预期：六个平台创建 API 断言、公共类型和基类行为全部通过。

---

## 任务 5：补充平台行为回归与边界测试

**目标：** 覆盖真实风险：宿主 API 缺失、异步错误双回调、样式/刷新参数漏传、销毁后重建。

**文件：**

- Modify: `tests/minigame-banner.test.mjs`

- [ ] **步骤 1：为六个平台建立统一 fake。** 每个平台 fake 的 `createBannerAd` 记录参数并返回 `show/hide/destroy`、`onLoad/onError/onResize/onClose`；支付宝错误使用 `{ error: 41, errorMessage: "ali-fail" }`，其他平台分别覆盖 `errCode/errMsg`、`errorCode/errMsg` 和 `code/msg`。

- [ ] **步骤 2：断言参数与生命周期。** 对每个平台实例化适配器，调用 `init({ bannerAdId: "banner-id" })`、`showBannerAd({ style: { left: 1, top: 2, width: 320 }, adIntervals: 30 }, callback)`，断言创建参数只含允许字段，显示成功只回调一次，尺寸监听收到数字，隐藏和销毁调用各一次。

- [ ] **步骤 3：断言缺失能力。** 将创建函数删除或返回 `null`，断言 `fail` 与 `onError` 返回 `MiniErrorCode.AD_NOT_INIT` 对应值且不抛异常；调用两次 `destroyBannerAd` 仍不抛错。

- [ ] **步骤 4：断言重建。** 第一次以 `adIntervals: 30` 展示，第二次以 `adIntervals: 60` 展示，断言旧实例 `destroy` 一次且新实例收到新参数；只修改 style 时不重复创建。

- [ ] **步骤 5：运行专项测试。** 执行：

```powershell
node --test tests/minigame-banner.test.mjs tests/oppo-ads.test.mjs
```

预期：Banner 专项与既有 OPPO 激励/插屏测试均通过。

---

## 任务 6：完整验证、发布检查和长期记忆

**文件：**

- Modify: `AGENTS.md`

- [ ] **步骤 1：运行完整测试。** 执行 `npm test`；预期 Node 测试全部通过且 TypeScript 全量检查无错误。

- [ ] **步骤 2：构建并检查声明复制。** 执行 `npm run build`，确认 `dist/MiniGame/types/` 下六份声明存在，且 `dist/MiniGame/index.d.ts` 包含新增公共类型导出。

- [ ] **步骤 3：检查发布清单。** 执行 `npm run pack:check`，确认只包含 `dist` 与 README 规定内容，不包含测试、源码生成物或临时文件。

- [ ] **步骤 4：更新长期记忆。** 在 `AGENTS.md` 的“当前状态与变更记忆”顶部追加：Banner 公共接口、六平台实现、主要文件、`npm test`/`npm run build`/`npm run pack:check`/`git diff --check` 的实际结果，并写明“尚未提交”。

- [ ] **步骤 5：最终差异检查。** 执行 `git diff --check`、`git status --short`，确认只包含本需求的源码、测试、声明、文档和 AGENTS 记录；不创建提交，等待宿主后续指示。

---

## 完成判定

- [x] `MiniHelper.ad()` 的静态类型可调用 Banner 四个方法。
- [x] 六个平台均调用自己的 `createBannerAd`，缺失 API 走统一失败回调。
- [x] Banner 显示、隐藏、销毁、尺寸、错误和回调去重均有测试证据。
- [x] 旧激励/插屏及 OPPO 既有测试不回归。
- [x] `npm test`、`npm run build`、等价临时缓存 `npm pack --dry-run --ignore-scripts` 和 `git diff --check` 均通过；系统全局缓存直接运行 `npm run pack:check` 因 EPERM 未通过。
- [x] `AGENTS.md` 已追加中文长期记忆，且未创建提交。

## 执行结果（2026-09-28）

- 已完成公共接口、Banner 基类生命周期、六个平台创建钩子和六份宿主声明；旧激励/插屏接口保持兼容。
- 已新增 `tests/minigame-banner.test.mjs` 与 `tests/minigame-banner.typecheck.ts`，覆盖惰性创建、参数、Promise 成功、错误去重、尺寸/关闭事件、未初始化、刷新间隔重建及六个平台 stub。
- `npm test` 通过：Node 测试 34 项全部通过，TypeScript 全量检查通过。
- `npm run build` 通过：生成 Banner 适配器和六份发布类型声明，ESM 相对导入修正通过。
- `npm run pack:check` 首次因系统全局 npm 缓存 EPERM 未完成；改用工作区临时 npm 缓存执行等价的 `npm pack --dry-run --ignore-scripts` 通过，发布清单包含六份平台声明和 Banner 适配器。
- `git diff --check` 通过；设计说明、实施计划和源码改动将随本次中文提交提交。
