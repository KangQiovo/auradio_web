# Auradio 交互官网实施计划

**Goal:** 在 auradio_web 交付真实、可交互且可部署的中文产品官网。
**Architecture:** Astro 静态多页 + React islands；内容快照与行为逻辑独立；共享布局与视觉规范统一。
**Tech Stack:** Astro 7、React 19、TypeScript、Motion、GSAP、Three.js。
**Spec:** site-spec.md

## 全局约束
不得改变应用源码可见性；不得发布应用私有安装包；不得把网页示意称为客户端截图。尊重减少动态和实际媒体事件，默认不自动播放。所有依赖保留准确许可证名称。

## 检查顺序
1. 先编写 tests/domain.test.mjs，运行 node --test tests/*.test.mjs，确认实现缺失时失败；实现 src/lib/audio.mjs 和 content.mjs 后复跑。
2. src/layouts/Site.astro 负责导航、SEO 和页脚；styles/global.css 统一排版、色彩与响应式；scripts/site.ts 负责菜单、减少动态和 GSAP 生命周期。
3. components/SoundField.tsx + lib/field.ts 负责静态回退、Three.js 按需加载和资源释放；AudioStudio.tsx 管理 HTMLAudioElement 的真实事件与本地文件。
4. ThemePreview.tsx 与 ProviderExplorer.tsx 只呈现明确标注的网页演示；五个信息页面消费相同的 content.mjs 快照。
5. scripts/generate-audio.mjs 生成三段原创合成试听；构建前生成，不依赖第三方音频、CDN 或版权歌曲。
6. 运行 npm test、npm run check、npm run build；Playwright 检查所有路由、菜单、控件、真实播放、错误输入、无 JS、减少动态与 390px/1440px 布局，截图后人工检查。
7. 以中文提交在独立分支交付，复核目标分支是否变化，保留既有工作流；通过构建后发布 dist 到既有 Pages，不发布源码目录作为站点。

## 高风险输入
浏览器不支持 WebGL/Web Audio；媒体文件空/过大/无法解码；存储不可用；缩窄屏幕；偏好减少动态；回到后台。每类都必须保留内容与可见反馈，不能让按钮失效或渲染循环泄漏。
