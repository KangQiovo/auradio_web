# Auradio 官网

Astro + React + TypeScript 多页面官网。Motion 负责状态过渡，GSAP 负责原生滚动关联，Three.js 负责按需加载的声场。沿用获准的 A + 声波品牌图标。

介绍仅包含当前预发布摘要。未来仅保留“更多可能，敬请期待”，不公布客户端具体版本号与更新记录，不发布内部文档、详细路线、私有源码、凭据或安装包。网页主题与声音体验是独立演示，不是客户端实拍。

开发要求 Node.js 22.12+。运行 npm ci、npm test、npm run check、npm run build；npm run dev 启动开发。仅将构建后的 dist 发布到站点。自定义域名使用根路径，本机便携预览使用 /auradio_web/。

体验展示精选专辑并按需接入官方播放器；实时声场仅读取主动选择的本地音频。默认不自动播放，不上传文件。支持减少动态与静态回退。第三方许可在构建时保存，GSAP 使用自身 Standard License，不标为 MIT。
