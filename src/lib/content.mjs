// Public editorial snapshot. Never fetch the private application repository in a visitor's browser.
export const release = Object.freeze({
  version: '0.1.0-demo10-fix2', name: 'Demo 10 · Fix 2', date: '2026-08-25',
  audited: '2026-09-21', source: '81573bc1aed803a1b33f5d155c845660686e1c6b',
  prerelease: true, publicDownload: null, versionCode: 26, languages: 16,
  minAndroid: '8.0', abi: ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'],
  themes: ['MIUIX', 'Liquid', 'Material 3'],
});
export const platforms = [
  {name:'Android',status:'已有预发布',available:true,note:'Android 8.0 起，当前为 Demo 10 Fix2。尚未开放官网公开下载。'},
  {name:'HarmonyOS',status:'尚无公开版本',available:false,note:'原生鸿蒙在项目路线中，不代表目前已有可下载客户端。'},
  {name:'Windows / macOS',status:'后续路线',available:false,note:'桌面体验仍属于后续工作，当前不提供正式安装包。'},
  {name:'Linux',status:'实验路线',available:false,note:'实验性桌面方向，暂无面向普通用户的公开版本。'},
  {name:'iOS',status:'未进入当前主线',available:false,note:'没有上线日期，也没有 App Store 下载入口。'},
];
export const providers = [
  {id:'netease',name:'网易云音乐',letter:'N',kind:'web',mode:'官方网页会话',nativeLibrary:false,detail:'在支持的 Android 版本中使用独立进程与数据目录的官方网页会话。完成后由用户主动确认返回；确认状态不等于原生账号或曲库已连接。'},
  {id:'qq',name:'QQ 音乐',letter:'Q',kind:'web',mode:'官方网页会话',nativeLibrary:false,detail:'网页操作与 Auradio 的本地播放分开。会话确认只保存平台标识，不读取网页 Cookie、Token 或账号资料。'},
  {id:'kugou',name:'酷狗音乐',letter:'K',kind:'web',mode:'官方网页会话',nativeLibrary:false,detail:'提供官方网页路径与明确返回反馈。退出本机网页会话或清除本地资料时，会同步撤销相应确认状态。'},
  {id:'qishui',name:'汽水音乐',letter:'S',kind:'external',mode:'官方 App / 下载入口',nativeLibrary:false,detail:'通过官方应用或下载入口继续操作。不把外部页面的打开包装为 Auradio 内部登录成功。'},
  {id:'apple',name:'Apple Music',letter:'A',kind:'external',mode:'官方网页 / 授权 / 应用',nativeLibrary:false,detail:'保留官方网页、授权页或官方应用路径。本版本不提供跨平台统一原生账号回调。'},
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
    '网易云、QQ 与酷狗的官方网页会话增加显式“完成登录”操作，并通过一次性回执返回非敏感确认状态。',
    '修复检查更新页长内容卡片的背景覆盖，避免卡片下半部分出现深色空块。',
    '修复播放器设置中，从真实滑杆或偏好项开始纵向手势时无法继续滚动的问题。',
    '错误结果、重复回执和已经关闭的协调器不再修改会话状态；版本身份更新为 VersionCode 26。',
  ]},
  {date:'2026-08-24',name:'Demo 10 · Fix',version:'0.1.0-demo10-fix',summary:'修复预发布中暴露的界面与连接反馈问题。',items:[
    '修复底部悬浮层、应用图标、移动网络更新、主题组件和授权反馈问题。',
    '补齐七家音乐平台的官方内容入口，并明确网页会话和原生平台接入的区别。',
  ]},
];
export const faqs = [
  {q:'现在能下载 Auradio 吗？',a:'Android 已有 Demo 10 Fix2 预发布记录，但目前没有核验到面向公众开放的安装包入口。官网暂不提供安装包，公开分发状态改变后会在进度页说明。'},
  {q:'体验室就是 Android 客户端吗？',a:'不是。体验室是官网独立实现的网页交互：合成试听、本地音频播放与声场视觉。主题预览也是网页示意，不是实机截图，也不代表客户端每一项设置都有相同效果。'},
  {q:'可以在这里听网易云或 QQ 音乐的歌单吗？',a:'不可以。当前版本提供相应官方网页或应用入口；确认网页会话不代表 Auradio 已获得平台 Token、歌单、会员权益、播放地址、歌词或下载能力。官网不接入这些平台的曲库。'},
  {q:'本地试听会上传我的音乐吗？',a:'不会通过本站代码上传。文件通过浏览器 object URL 在当前页面中播放，替换文件或离开页面后释放。不同格式能否解码取决于浏览器，单文件限制为 100 MiB。'},
  {q:'电脑、鸿蒙和 iPhone 版本什么时候推出？',a:'这些平台有不同的后续路线，但当前没有可承诺的公开发布日期。进度页将已存在的 Android 预发布与其他平台计划分开列出。'},
];
