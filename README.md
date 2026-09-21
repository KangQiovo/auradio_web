# Auradio 官网

Astro + React + TypeScript 多页面官网，实际使用 Motion、GSAP 与 Three.js，沿用获准的 A + 声波品牌图标。

## 开发与运行

要求 Node.js 22.12 或以上兼容版本：

```sh
npm ci
npm test
npm run check
npm run build
npm start
```

打开终端打印的本机地址，默认 `http://127.0.0.1:4173/auradio_web/`。开发模式使用 `npm run dev`。

完整交付 ZIP 已附带 dist：解压后 Windows 双击 `start.cmd`，macOS / Linux 运行 `sh start.sh`，不需要重新下载 npm 依赖。启动器支持 Node.js、Python 3 或 Windows PowerShell 后备服务。不要使用 file:// 直接打开 HTML。

## 页面与交互

概览、声音体验室、当前进度、使用与隐私、技术鸣谢和 404。支持主题示意切换、示例曲库搜索、平台说明选择、FAQ、合成试听与本地文件真实播放、进度和音量控制、三种声场、减少动态与无 WebGL 回退。

Motion 管理状态过渡；GSAP 管理滚动关联但不劫持滚轮；Three.js 按需加载声场。Motion / Three.js 为 MIT；GSAP 使用自身 Standard License，不标为 MIT。构建保留第三方许可或声明。

## 公开信息边界

只描述已核对的预发布摘要。未来保留“更多可能，敬请期待”，不发布内部文件、详细路线、客户端源码、凭据或安装包。网页主题与声音体验是独立演示，不是客户端实拍或在线曲库。仅复用获准的品牌标识。

没有自动播放、音频上传、账号表单或分析 SDK。本地音频仅在当前页面播放，文件上限 100 MiB；浏览器解码能力决定格式兼容性。页脚动态偏好只保存在 localStorage。

## 验证与部署

12 个领域/边界/服务器测试。独立 CI 对生产构建完成 46 项真实浏览器检查，涵盖 1440、390、360 像素宽度和实际媒体交互。成功记录：https://github.com/KangQiovo/auradio_web/actions/runs/35584913697

Pages 工作流只部署 dist，不能把整个仓库作为网站根目录。默认路径 `/auradio_web/`；自定义域名须修改 astro.config.mjs、robots 与 sitemap 后重新构建。
