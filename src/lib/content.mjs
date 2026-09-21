// Public editorial snapshot. Never fetch the private application repository in a visitor's browser.
export const release = Object.freeze({
  version: '0.1.0-demo10-fix2', name: 'Demo 10 · Fix 2', date: '2026-08-25',
  audited: '2026-09-21',
  prerelease: true, publicDownload: null, languages: 16,
  minAndroid: '8.0', abi: ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'],
  themes: ['MIUIX', 'Liquid', 'Material 3'],
});
export const platforms = [
  {name:'Android',status:'预发布打磨中',available:true,note:'Android 8.0 起。当前为 Demo 10 Fix2，官网公开下载暂未开放。'},
  {name:'更多可能',status:'敬请期待',available:false,note:'先把眼前的聆听体验做好。更多消息，准备好后再与你分享。'},
];
export const providers = [
  {id:'netease',name:'网易云音乐',letter:'N',kind:'web',mode:'官方网页会话',nativeLibrary:false,detail:'通过官方网页继续操作，完成后主动返回 Auradio。网页操作的确认，不代表原生账号或曲库已经连接。'},
  {id:'qq',name:'QQ 音乐',letter:'Q',kind:'web',mode:'官方网页会话',nativeLibrary:false,detail:'在官方页面中处理账号操作，与 Auradio 本地播放分开。这里不读取你的平台账号，也不接入在线歌单。'},
  {id:'kugou',name:'酷狗音乐',letter:'K',kind:'web',mode:'官方网页会话',nativeLibrary:false,detail:'提供官方网页入口和返回反馈。你仍然在平台自己的页面内操作，不会因此获得额外的曲库或下载权限。'},
  {id:'qishui',name:'汽水音乐',letter:'S',kind:'external',mode:'官方 App / 下载入口',nativeLibrary:false,detail:'通过官方应用或下载入口继续操作。不把外部页面的打开包装为 Auradio 内部登录成功。'},
  {id:'apple',name:'Apple Music',letter:'A',kind:'external',mode:'官方网页 / 授权 / 应用',nativeLibrary:false,detail:'提供相应的官方网页或应用路径。平台内的可用内容与权益，仍以官方服务为准。'},
  {id:'spotify',name:'Spotify',letter:'S',kind:'external',mode:'官方网页 / 授权 / 应用',nativeLibrary:false,detail:'访问能力仍由平台本身决定，不能据此获得会员权益、歌单、播放地址或下载能力。'},
  {id:'youtube',name:'YouTube Music',letter:'Y',kind:'external',mode:'官方网页 / 授权 / 应用',nativeLibrary:false,detail:'使用官方内容入口，不绕过地区、会员、音质或 DRM 限制，也不在官网要求你输入平台账号。'},
];
export const motionSources = [
  {name:'Motion',repository:'motiondivision/motion',starred:true,license:'MIT',role:'主题切换、选择状态与界面过渡。',url:'https://motion.dev/'},
  {name:'GSAP',repository:'greensock/GSAP',starred:true,license:'GSAP Standard License',role:'滚动进度与章节出现节奏；不劫持页面滚动。',url:'https://gsap.com/'},
  {name:'Three.js',repository:'mrdoob/three.js',starred:true,license:'MIT',role:'按需加载的声场线条、指针视差与真实音频响应。',url:'https://threejs.org/'},
];
export const changes = [
  {date:'2026-08-25',name:'Demo 10 · Fix 2',version:'0.1.0-demo10-fix2',summary:'把返回、滚动和状态反馈再理顺一些。',items:[
    '调整官方网页操作后的返回与确认反馈，让当前状态更清楚。',
    '修复检查更新页长内容卡片的背景覆盖，避免卡片下半部分出现深色空块。',
    '修复播放器设置中，从真实滑杆或偏好项开始纵向手势时无法继续滚动的问题。',
    '完善异常情况下的提示与状态处理。',
  ]},
  {date:'2026-08-24',name:'Demo 10 · Fix',version:'0.1.0-demo10-fix',summary:'修复预发布中暴露的界面与连接反馈问题。',items:[
    '修复底部悬浮层、应用图标、移动网络更新、主题组件和授权反馈问题。',
    '补齐七家音乐平台的官方内容入口，并明确网页会话和原生平台接入的区别。',
  ]},
];
export const faqs = [
  {q:'现在能下载 Auradio 吗？',a:'Android 当前处于 Demo 10 Fix2 预发布阶段。官网公开下载暂未开放；准备好与大家见面时，会在这里公布。'},
  {q:'体验室就是 Android 客户端吗？',a:'不是。体验室是官网独立实现的网页交互：合成试听、本地音频播放与声场视觉。主题预览也是网页示意，不是实机截图，也不代表客户端每一项设置都有相同效果。'},
  {q:'可以在这里听网易云或 QQ 音乐的歌单吗？',a:'不可以。当前版本提供相应官方网页或应用入口；确认网页会话不代表 Auradio 已获得平台 Token、歌单、会员权益、播放地址、歌词或下载能力。官网不接入这些平台的曲库。'},
  {q:'本地试听会上传我的音乐吗？',a:'不会通过本站代码上传。文件通过浏览器 object URL 在当前页面中播放，替换文件或离开页面后释放。不同格式能否解码取决于浏览器，单文件限制为 100 MiB。'},
  {q:'接下来，还会有什么？',a:'我们会继续打磨聆听中的细节。更多可能，准备好后再与你分享。敬请期待；目前不预告具体功能或日期。'},
];
