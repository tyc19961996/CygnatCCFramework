# 233 APK Android 安装器实施计划

Creator 3.8.5 的 Gradle 工程引用游戏的 `native/engine/android`。为 233 渠道增加主动执行的 Node 安装器，接线保存在该目录中，常规 Build 和 Make 可以直接复用。

- [x] 在 `tests/apk233-installer.test.mjs` 从 Android 模板夹具验证预演、接线、状态检查、重复运行和冲突保护。
- [x] 在 `scripts/install-apk233-ads.mjs` 实现 `--project`、`--aar`、`--dry-run`、`--apply`、`--check`。按已知模板补齐桥接文件、AAR、Gradle 依赖、Activity 钩子、Manifest 和保留规则。安装前先完成所有文件检查。
- [x] 更新框架包文件清单、README 和接入指南。用本机 Creator 3.8.5 的真实模板及官方 AAR 在临时项目中验证首次接线和二次运行。
- [x] 执行 `npm test`、`npm run build`、`npm run pack:check` 和 `git diff --check`。

## 验证结果

- 安装器专项 7 项覆盖预演、幂等、补接线和冲突保护。用真实 Creator 3.8.5 模板与官方 AAR 验证了预演、安装、检查、二次安装、Manifest 可见性和 AAR 哈希。
- 完整测试、类型检查、构建和包清单均通过。框架包携带安装器、Java 桥接和指南。
- 实际游戏的 Gradle 签名打包和 233 真机实播由渠道项目验收。
