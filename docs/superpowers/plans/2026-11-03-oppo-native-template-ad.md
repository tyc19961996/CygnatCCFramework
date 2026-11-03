# OPPO 原生模板广告实施计划

目标：按已确认设计公开模板广告调用接口，保持旧广告适配器兼容。使用 TypeScript、Node 内置测试及最小宿主 stub，在当前工作区执行；用户在实施完成后授权提升到 `0.3.12` 并提交。

## 步骤一：先补契约与运行时回归

- [x] 新增 `tests/oppo-native-template-ad.test.mjs`，转译真实 `BaseAds`、`OppoAds`，注入 `qg` stub。验证惰性创建、样式过滤、事件、复用重建、销毁解绑、迟到回调、异常及非 OPPO 兜底。
- [x] 新增 `tests/minigame-native-template-ad.typecheck.ts`，从根入口导入公共类型，验证旧聚合接口对象仍合法、`MiniHelper.ad()` 可直接调用新能力、样式禁止高度。
- [x] 执行 `node --test tests/oppo-native-template-ad.test.mjs` 与 `npx tsc -p tsconfig.json --noEmit`，确认因缺失能力而失败。

核心消费契约：

```ts
const ads = MiniGame.MiniHelper.ad();
ads.init({ nativeTemplateAdId: "template-id" });
ads.showNativeTemplateAd({ style: { width: 328 } }, { fail: (code, message) => {} });
ads.hideNativeTemplateAd();
ads.destroyNativeTemplateAd();
```

## 步骤二：实现公共能力和平台生命周期

- [x] 新增 `MiniGame/interface/IMiniNativeTemplateAds.ts`，定义样式、显示参数、回调、点击数据、监听器和独立能力。
- [x] 修改 `IMiniAds.ts`，加入可选初始化字段及可选聚合能力；修改 `MiniHelper.ts` 保证内置返回值可直接调用。
- [x] `BaseAds.ts` 提供明确失败及安全隐藏/销毁兜底；`OppoAds.ts` 维护实例、监听解绑和独立请求标识，调用 `qg.createCustomAd` 及 `show()`，不调用 `load()`。
- [x] 更新 `lib.oppo.api.d.ts` 和 `MiniGame/index.ts`，公开全部新类型，保留现有声明复制流程。
- [x] 再执行专项测试与全量类型检查，预期全部通过。

## 步骤三：文档、发布产物与验收

- [x] README 添加中文调用示例、平台版本与布局/频率说明。
- [x] 执行 `npm test`、`npm run build`、`npm run pack:check`，检查包内声明与复制的 OPPO 类型。
- [x] 检查 Markdown 代码围栏、相对链接与 `git diff --check`，复核完整差异。
- [x] 回填实际验证结果，更新设计状态及 `AGENTS.md`；未收到提交指示，不创建提交。

## 实际结果

- 新增回归先红后绿：最初七项专项因缺失新接口失败，全量类型检查因缺失公开类型与配置字段失败；实现后专项通过，随后补充两项异常清理与回调重入测试。
- `npm test`：129 项 Node 测试全部通过，全量 TypeScript 检查通过。
- `npm run build`：成功，生成新接口及平台声明，复制 OPPO 宿主声明并修正 ESM 导入。
- 临时 npm 缓存下 `npm run pack:check`：成功，版本 `0.3.11`，656 文件，包含新接口声明及更新后的 README。
- 对比源码和产物中的 OPPO 声明字节一致，检查 `dist/MiniGame/index.d.ts` 的 OPPO 三斜线引用及新类型导出通过。
- 从包根入口按 README 的 `moduleResolution: bundler` 配置进行严格模式消费：通过，含旧适配器兼容与禁止高度的类型断言。
- 额外探测 `NodeNext` 严格消费未通过：现有生成声明使用无扩展名相对导入；本次不修改既有构建边界，按 README 明示的 bundler 配置验证。该探测不能作为 NodeNext 支持证明。
- 独立只读代码审查未发现需修复的实质问题，随后补充隐藏异常、部分解绑失败和成功回调重入回归。
- Markdown 代码围栏、相对链接及 `git diff --check` 通过。
- 初次实施完成时未提交、未发布，版本为 `0.3.11`。OPPO 真机广告填充、模板布局与用户关闭仍需真机验收。

## 版本与提交验收

- 用户已授权提升版本并提交；`package.json` 和 `package-lock.json` 同步为 `0.3.12`，依赖不变。
- 版本更新后 `npm test`（129 项及全量类型检查）、`npm run build`、临时 npm 缓存下 `npm run pack:check`（656 文件、版本 `0.3.12`）全部通过。
- 提交范围为完整模板广告源码、类型、测试、中文文档及版本文件；不包含 `dist`、依赖或宿主生成物。
- 提交主题：`新增(MiniGame)：接入 OPPO 原生模板广告并升级到 0.3.12`；不推送远端、不发布 npm。
