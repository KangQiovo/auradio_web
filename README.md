# Auradio 官网

Auradio 的中文产品官网：Astro 7 + React 19 + TypeScript，部署至 GitHub Pages。

## 访问

- 官网：https://kangqiovo.github.io/auradio_web/
- 体验室：https://kangqiovo.github.io/auradio_web/experience/
- 版本进度：https://kangqiovo.github.io/auradio_web/progress/

## 真实内容基线

2026-09-21 核对的 Android 最新预发布为 `0.1.0-demo10-fix2`，发布于 `2026-08-25`，对应不可变提交 `81573bc1aed803a1b33f5d155c845660686e1c6b`。旧 main 的 Flutter README 不作为当前发布线依据。公开官网不改变客户端源码的私有状态，也不发布应用安装包。

目前仅描述已有本地曲库结构、歌曲/专辑/艺术家分类、三套客户端主题、16 种客户端语言、已核对修复记录和官方平台入口边界。其他平台没有公开版本或承诺日期。更新文案请修改 `src/lib/content.mjs` 并同步检查来源，不在多个页面分别硬编码新功能承诺。

## 页面与交互

- 概览：编辑式产品介绍、Three.js 声场、主题与曲库网页示意、平台入口解释、FAQ。
- 体验室：原创合成试听、本地音频选择、真实播放/暂停/时间/拖动/音量、三种声场与响应强度、全屏。
- 当前进度：预发布详情、版本记录、平台状态、已知限制。
- 使用与隐私：本站本地文件、偏好保存、托管与平台边界说明。
- 技术鸣谢、许可索引、404、robots 和 sitemap。

网页演示不是 Android 客户端截图，也不是在线曲库。没有公开下载占位按钮、虚构用户数、假播放进度、注册或订阅表单。

## 动效来源

2026-09-21 公开 Star 审计核对了维护者的 680 个 Star；本官网实际使用其中三个项目：

| 项目 | 用途 | 许可 |
| --- | --- | --- |
| motiondivision/motion | 主题与选择状态、界面过渡 | MIT |
| greensock/GSAP | 章节与阅读进度关联，原生滚动不被接管 | GSAP Standard License，不是 MIT |
| mrdoob/three.js | 一个 draw call 的声场线条、指针响应、Web Audio 响应 | MIT |

沿用项目原有 A + 声波品牌图标。声音与几何由本站代码生成；不引入版权歌曲、专辑封面、远程字体或分析 SDK。构建输出保留所用主要运行时的许可证；GSAP 保留声明并链接完整许可条款。

## 本地运行

要求 Node.js 22.12 或以上兼容版本。

```sh
npm ci
npm run dev
npm test
npm run check
npm run build
npm run preview
```

`predev` / `prebuild` 会生成三段 24 秒 PCM 合成音频与许可索引。音频不自动播放；默认音量 45%。本地文件上限 100 MiB，只通过 object URL 读取，替换或卸载时释放。脚本不上传音频。

## 可访问性与性能

导航有键盘焦点、跳转正文、移动菜单和 Escape 关闭。控件使用原生按钮、输入、details 与明确的可访问名称。尊重系统减少动态；页脚开关只保存 `auradio.motion`。Three.js 按视口加载，离屏/后台/静态模式停止循环；清理观察器、监听器、GPU 资源与音频上下文。无 WebGL 时保留静态图形，无 JavaScript 时保留介绍与导航。

## 部署与维护

仅将 `dist` 部署到 Pages，不把仓库根目录直接当成网站。`astro.config.mjs` 固定 `base: /auradio_web`。更换域名或仓库名时同步修改 `site`、`base`、robots 和 sitemap。

行为测试在 `tests/`；浏览器复核脚本在 `scripts/browser-qa.py`。设计与信息边界见 `docs/site-spec.md`、实施顺序见 `docs/implementation-plan.md`。构建、视觉或审计失败不能当作已发布成功。
