# Auradio 官网

面向访问者的产品网站与独立网页听音室。主站采用 Astro 静态多页面，React 仅承载互动组件。代码不依赖应用仓库、私有 API 或部署密钥。

## 本地开发

使用 Node.js 22.12 或更高版本。

```sh
npm ci
npm run dev
```

默认路径为 `/auradio_web/`。发布到独立域名时，在 `astro.config.mjs` 修改 `site` 与 `base`，并同步基础路径测试。

```sh
npm run check
npm test
npm run build
npm test
npm run preview
```

## 页面与交互

首页、独立体验页、开发近况、关于、本站隐私说明与 404 页面。听音室支持点击后播放原创合成片段、暂停、进度调整、音量、本地音频、三种视觉形态与全屏。WebGL 不可用时保留静态视觉与音频功能。

Motion 负责界面切换和控件反馈；GSAP 负责滚动内容编排；Three.js 负责独立实现的实时线条雕塑。三个项目均来自作者公开 Star 收藏。它们没有互相控制同一 DOM 动画属性。GSAP 使用其自身标准许可，不宣称为 MIT；详见 `THIRD_PARTY_NOTICES.md`。

## 内容与资源边界

`src/data/public-content.json` 是手工维护的公开口径，不自动同步内部文档。更新时须区分已实现、预览和未开放能力。官网不发布应用安装包，不嵌入私有仓库链接、内部文件、账号信息、凭据、详细路线或未确定的日期。

公开资源仅包含获准使用的品牌 SVG 与第三方许可说明。网页界面、视觉和合成试听均为官网独立制作，不是应用源码、实机截图或应用功能承诺。品牌标识权利保留；仓库公开不表示应用源码开放。

音频仅在浏览器处理，限制为 30 MB、30 分钟以内。没有音频上传、账号登录、分析追踪或麦克风请求。减少动态默认跟随系统，手动选择仅保存一个本地偏好值。

## 验证与发布

GitHub Actions 先执行锁定安装、依赖审计、类型检查、内容与边界测试、生产构建、链接检查和 Chromium 交互测试，再仅发布 `dist/` 到 GitHub Pages。不会将整个源仓库作为静态资源发布。

浏览器测试使用 Python 3.12 与 Playwright 1.57.0。先启动 `npm run preview -- --host 127.0.0.1 --port 4321`，再运行：

```sh
pip install playwright==1.57.0
python -m playwright install chromium
python tests/browser_smoke.py
```

测试截图和结果仅保留为短期 Actions 产物，不放进网站公开资源目录。浏览器测试会覆盖真实音频进度、本地文件、WebGL 与降级、减少动态、键盘、主题、FAQ、移动导航和无 JavaScript 阅读。
