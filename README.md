# Auradio 官网

Auradio 的中文产品官网：Astro 7 + React 19 + TypeScript，部署至 GitHub Pages 已绑定的正式域名。

## 访问

- 官网：https://auradio.kangqiovo.com/
- 声音体验室：https://auradio.kangqiovo.com/experience/
- 当前进度：https://auradio.kangqiovo.com/progress/

## 内容基线

2026-09-21 核对的 Android 预发布为 `0.1.0-demo10-fix2`，发布于 `2026-08-25`。内容快照集中在 `src/lib/content.mjs`，依据对应发布记录与代码，而不是旧 main 的 Flutter README。

仅介绍已经存在的本地曲库结构、分类与搜索、三套客户端主题、16 种客户端语言、已核对修复和官方平台入口边界。未上线平台不写成已发布功能，不提供承诺日期。官网代码公开不改变客户端源码的私有状态，不发布私有安装包。

## 页面和交互

概览、声音体验室、当前进度、使用与隐私、技术鸣谢，以及 404、robots 和 sitemap。

体验室有原创合成试听、本地音频选择、真实播放/暂停/进度/音量/切歌、三种声场与强度调整、全屏或明确的兼容提示。主题与示例曲库可以切换、搜索和分类；平台入口说明可以选择；FAQ 使用原生折叠交互。所有网页示意均与 Android 客户端截图区分，不表示接入在线曲库。

没有虚构用户量、假下载、假播放进度、注册或订阅表单。

## 实际使用的动效库

从维护者已 Star 的项目中选取，来源核对日期 2026-09-21。

| 项目 | 实际用途 | 许可 |
| --- | --- | --- |
| motiondivision/motion | 主题、选择状态与界面过渡 | MIT |
| greensock/GSAP | 章节与阅读进度关联，不接管原生滚动 | GSAP Standard License，不是 MIT |
| mrdoob/three.js | 声场线条、指针响应与真实音频响应 | MIT |

保留主要运行时随包许可；GSAP 保留声明并链接完整条款。品牌沿用项目已有 A + 声波图标；声音与几何由本站代码生成。不引入版权歌曲、远程字体或分析 SDK。

## 开发与验证

要求 Node.js 22.12 或以上兼容版本。

```sh
npm ci
npm run dev
npm test
npm run check
npm run build
npm run preview
```

`predev` / `prebuild` 生成三段 24 秒 PCM 合成试听和许可索引。默认不自动播放，音量 45%。本地文件上限 100 MiB，通过 object URL 读取；替换或离开时释放，不经本站代码上传。

键盘可访问导航和控件；尊重系统减少动态，也提供手动开关。Three.js 按需加载，离屏、后台和静态模式停止持续渲染；不支持 WebGL 时保留静态插图。无 JavaScript 时介绍与导航仍可阅读。

## 发布

`astro.config.mjs` 使用 `site: https://auradio.kangqiovo.com` 与 `base: /`。正式站点位于自定义域名根目录，不使用 `/auradio_web/` 前缀。更换域名时同步修改 CNAME、robots、sitemap、部署测试与线上检查的允许域名。

PR 运行领域测试、类型检查、生产构建、依赖审计及 46 项浏览器回归；main 通过后只将 `dist/` 部署到 Pages。部署后验证实际 HTTPS 页面、构建标识、样式、脚本、音频和爬虫入口。不要把 CI 发布状态单独当作线上页面可访问的证据。

浏览器脚本：`scripts/browser-qa.py`。线上检查：`scripts/live-smoke.py`。首次交付验证说明：`docs/verification.md`。浏览器证据与线上报告保存在相应 Actions 运行产物中，不包含用户音频或账号信息。
