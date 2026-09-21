from pathlib import Path
import re, gzip
r=Path.cwd()
p=r/'src/lib/content.mjs';s=p.read_text()
s=re.sub(r", source: '[a-f0-9]{40}'",'',s).replace('versionCode: 26, ','')
a=s.index('export const platforms =');b=s.index('export const providers =')
s=s[:a]+'''export const platforms = [
  {name:'Android',status:'预发布打磨中',available:true,note:'Android 8.0 起。当前为 Demo 10 Fix2，官网公开下载暂未开放。'},
  {name:'更多可能',status:'敬请期待',available:false,note:'先把眼前的聆听体验做好。更多消息，准备好后再与你分享。'},
];
'''+s[b:]
s=s.replace('在支持的 Android 版本中使用独立进程与数据目录的官方网页会话。完成后由用户主动确认返回；确认状态不等于原生账号或曲库已连接。','通过官方网页继续操作，完成后主动返回 Auradio。网页操作的确认，不代表原生账号或曲库已经连接。')
s=s.replace('网页操作与 Auradio 的本地播放分开。会话确认只保存平台标识，不读取网页 Cookie、Token 或账号资料。','在官方页面中处理账号操作，与 Auradio 本地播放分开。这里不读取你的平台账号，也不接入在线歌单。')
s=s.replace('提供官方网页路径与明确返回反馈。退出本机网页会话或清除本地资料时，会同步撤销相应确认状态。','提供官方网页入口和返回反馈。你仍然在平台自己的页面内操作，不会因此获得额外的曲库或下载权限。')
s=s.replace('保留官方网页、授权页或官方应用路径。本版本不提供跨平台统一原生账号回调。','提供相应的官方网页或应用路径。平台内的可用内容与权益，仍以官方服务为准。')
s=s.replace('网易云、QQ 与酷狗的官方网页会话增加显式“完成登录”操作，并通过一次性回执返回非敏感确认状态。','调整官方网页操作后的返回与确认反馈，让当前状态更清楚。')
s=s.replace('错误结果、重复回执和已经关闭的协调器不再修改会话状态；版本身份更新为 VersionCode 26。','完善异常情况下的提示与状态处理。')
s=s.replace('Android 已有 Demo 10 Fix2 预发布记录，但目前没有核验到面向公众开放的安装包入口。官网暂不提供安装包，公开分发状态改变后会在进度页说明。','Android 当前处于 Demo 10 Fix2 预发布阶段。官网公开下载暂未开放；准备好与大家见面时，会在这里公布。')
s=s.replace('电脑、鸿蒙和 iPhone 版本什么时候推出？','接下来，还会有什么？').replace('这些平台有不同的后续路线，但当前没有可承诺的公开发布日期。进度页将已存在的 Android 预发布与其他平台计划分开列出。','我们会继续打磨聆听中的细节。更多可能，准备好后再与你分享。敬请期待；目前不预告具体功能或日期。')
p.write_text(s)
p=r/'src/pages/index.astro';s=p.read_text().replace('当前 Android 发布线已经有本地曲库的数据与界面结构，按歌曲、专辑和艺术家组织内容，并提供搜索与播放队列相关逻辑。','当前 Android 预发布围绕本地音乐展开：按歌曲、专辑和艺术家浏览，搜索想听的内容，整理播放队列。').replace('当前正式开发路线使用 Kotlin / Compose。Demo 10 Fix2 继续修复播放器设置触控、更新页面布局和官方网页会话的返回反馈。','当前从 Android 开始打磨。Demo 10 Fix2 继续改善播放器设置的滑动操作、更新页面的排版，以及官方网页操作后的返回反馈。').replace('完整进度与平台状态','了解当前版本').replace('最新已核对的 Android 预发布。','当前 Android 预发布。');p.write_text(s)
p=r/'src/components/ProviderExplorer.tsx';s=p.read_text().replace('Android 8.0 / 8.1 使用官方 Custom Tab 回退。这里仅解释客户端入口，不在官网发起登录。','这里仅说明客户端的官方入口；官网不发起登录，也不提供平台曲库。');p.write_text(s)
p=r/'src/pages/progress.astro';s=p.read_text().replace('与未发布平台的状态','与简要开发动态').replace('查看真实预发布进度','查看预发布进度').replace('版本状态、已经修改的内容，还有仍然存在的限制。','分享已经落地的改进，不提前许诺尚未完成的功能。').replace('这不是实时构建状态。','更多消息，准备好后再说。').replace('<div><dt>版本代码</dt><dd>{release.versionCode}</dd></div>','').replace('<div><dt>CPU 架构</dt><dd>{release.abi.join(\' / \')}</dd></div>','').replace('应用仓库及安装包仍处于受限分发状态。官网不提供私有资源的下载替代入口。','准备好与大家见面时，会在这里公布。在此之前，可以先试试官网的声音体验室。').replace('平台状态','接下来').replace('开发路线，<br/>不当成已上线。','更多可能，<br/>留一点期待。').replace('模拟器结果不代替实机。','体验还在不断打磨。').replace('发布说明记录了 API 26 与 API 36 的验证，但不能代替真实蜂窝网络、厂商系统、鸿蒙兼容环境与平台真实账号的最终验收。','不同设备、系统和网络环境下的体验仍需继续验证。这一阶段我们更关心实际使用中的反馈，不作普遍稳定性的承诺。');p.write_text(s)
p=r/'src/pages/privacy.astro';s=p.read_text();a=s.index('      <section id="platforms">');b=s.index('      <section id="limits">')
s=s[:a]+'''      <section id="platforms"><span class="section-number">03 / 客户端平台入口</span><h2>在官方页面中，继续操作。</h2><p>当前 Android 预发布提供部分音乐平台的官方网页或应用入口。这不代表统一原生账号、跨平台歌单或在线播放服务已接入。</p><p>“官方网页会话已确认”只表示用户完成网页操作并主动返回。平台内容、会员权益和可用功能仍由相应服务决定。</p><p>本官网没有音乐平台登录表单，不要求你提交账号、密码、Cookie 或 Token，不提供绕过会员、地区或版权限制的方法。</p></section>
'''+s[b:];s=s.replace('其他平台没有承诺发布日期。','后续安排不提前作日期承诺。');p.write_text(s)
p=r/'tests/domain.test.mjs';s=re.sub(r"  assert.equal\(release.source, '[a-f0-9]+'\);\n",'',p.read_text());p.write_text(s)
p=r/'scripts/browser-qa.py';s=p.read_text().replace("'不读取网页 Cookie'","'不读取你的平台账号'").replace('电脑、鸿蒙和 iPhone 版本什么时候推出？','接下来，还会有什么？').replace('这些平台有不同的后续路线','更多可能，准备好后再与你分享').replace("wait_until='networkidle'","wait_until='domcontentloaded'").replace('set_default_timeout(12000)','set_default_timeout(45000)')
s=s.replace("no_overflow(page, f'desktop {path or \"home\"}')", "no_overflow(page, f'desktop {path or \"home\"}')\n                page.screenshot(path=str(OUTPUT / (('home' if not path else path.strip('/').replace('.','-'))+'-initial.png')), animations='disabled')")
p.write_text(s)
css=r/'.delivery/styles.css.gz'
if css.exists():
 (r/'src/styles').mkdir(exist_ok=True)
 (r/'src/styles/global.css').write_bytes(gzip.decompress(css.read_bytes()))
for path in ['README.md','docs/site-spec.md','docs/implementation-plan.md']:
 p=r/path;p.write_text('''# Auradio 官网

Astro + React + TypeScript 多页面官网。Motion 负责状态过渡，GSAP 负责原生滚动关联，Three.js 负责按需加载的声场。沿用获准的 A + 声波品牌图标。

介绍仅包含当前预发布摘要。未来仅保留“更多可能，敬请期待”，不发布内部文档、详细路线、私有源码、凭据或安装包。网页主题与声音体验是独立演示，不是客户端实拍。

开发要求 Node.js 22.12+。运行 npm ci、npm test、npm run check、npm run build；npm run dev 启动开发。只部署 dist 到 /auradio_web/，不部署项目根目录。

体验室使用原创合成音频，也可读取主动选择的本地音频。默认不自动播放，不上传文件。支持减少动态与静态回退。第三方许可在构建时保存，GSAP 使用自身 Standard License，不标为 MIT。
''')
# Obsolete workflow and transport files do not belong in the final source package.
import shutil
shutil.rmtree(r/'.delivery',ignore_errors=True)
for p in (r/'.github/workflows').glob('*.yml'):
 if p.name not in ['audit-motion.yml','package-site.yml','static.yml']:p.unlink()
p=r/'index.html'
if p.exists():p.unlink()
Path(__file__).unlink()
