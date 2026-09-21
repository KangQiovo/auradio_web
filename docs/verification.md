# 官网交付验证

验证日期：2026-09-21。对应公开官网，不是 Android 客户端实机验收。

## 已完成的检查

- `npm test`：7 项领域测试通过。
- `npm run check`：23 个 Astro / TypeScript 文件，0 错误、0 警告、0 提示。
- `npm run build`：6 个页面及 robots / sitemap 成功生成。
- `npm audit --omit=dev --audit-level=high`：当次报告 0 个漏洞。
- Playwright + Chrome 152.0.7977.82 / Linux：46 项浏览器检查通过，测试收集的页面异常与控制台警告/错误列表为空。

浏览器检查包括所有页面与内部链接、Three.js 实际渲染、主题切换、示例曲库搜索与分类、平台说明切换、FAQ、真实音频播放/暂停/进度/音量、试听切换、本地音频播放与错误输入、全屏或明确降级、无上传请求、360px / 390px / 1440px 排版、移动菜单键盘操作、系统和手动减少动态、无 JavaScript 与无 WebGL 回退。

主流程中因切歌、释放本地 object URL 或页面导航而取消的音频请求，会在诊断记录中标为 `ERR_ABORTED`。这与页面异常或无法播放不同，音频播放路径有独立断言。

## 修复与证据

媒体页面不以 `networkidle` 判断可交互：使用内容与 React island 水合状态检查。减少动态偏好改用 `useSyncExternalStore` 的一致服务端快照，修复系统减少动态时的 React 418 水合不一致。

成功运行记录：https://github.com/KangQiovo/auradio_web/actions/runs/35584228548

已人工查看该次产物中的桌面首页、手机首页及实际播放中的体验室截图。CI 安装中文字体仅用于验证排版；网站不分发这些字体，使用访客设备的系统字体。

## 边界

未将上述结果宣称为 Safari、Firefox 或 Android / iOS 真机的完整兼容性认证。WebGL 采用软件渲染进行 CI 验证；不同 GPU 的性能仍可能不同。发布页面继续明确官网交互示意与真实客户端的区别，公开安装包入口仍未开放。

后续 PR 与 main 会重新运行同一组测试。只有 main 上通过验证的 `dist/` 可以进入 GitHub Pages 部署，不发布仓库根目录。
