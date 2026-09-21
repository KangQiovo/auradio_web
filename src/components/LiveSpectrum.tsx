import {useEffect, useState} from 'react';
import {useSignalKind} from '../lib/audio-signal';
import {canSyncTabAudio, startTabAudio, stopTabAudio} from '../lib/tab-audio';
import SpectrumStrip from './SpectrumStrip';

export default function LiveSpectrum() {
  const [supported, setSupported] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const kind = useSignalKind();
  useEffect(() => {setSupported(canSyncTabAudio());return () => stopTabAudio();}, []);
  async function start() {
    setBusy(true);setMessage('');
    try {await startTabAudio();} catch (error) {setMessage(error instanceof Error ? error.message : '声音同步未能启动，官方试听不受影响。');}
    finally {setBusy(false);}
  }
  return <section className="live-spectrum-panel" aria-label="官方试听的实时频谱">
    <div className="live-spectrum-title"><span>让画面，跟上声音。</span><span>LIVE AUDIO</span></div>
    <SpectrumStrip/>
    <div className="live-spectrum-actions">
      {kind === 'tab' ? <button type="button" className="signal-button" onClick={stopTabAudio}>停止声音同步</button> :
        <button type="button" className="signal-button" disabled={!supported || busy} onClick={() => void start()}>{busy ? '请在浏览器中选择标签页…' : '同步当前标签页声音'}</button>}
      {busy && <button type="button" className="signal-cancel" onClick={() => {stopTabAudio();setBusy(false);setMessage('已取消同步。浏览器选择窗口中也可点击取消。');}}>取消同步</button>}
    </div>
    <p className="signal-help">{supported ? '先在官方播放器中播放，再选择当前 Auradio 标签页并勾选“分享标签页音频”。三首作品共用这条实时声音通路。' : '此浏览器无法提供标签页声音共享。可在支持的桌面浏览器开启，或选择本地音频体验真实频谱；触控互动不受影响。'}</p>
    {message && <p className="signal-message" role="status">{message}</p>}
    <details className="signal-privacy"><summary>同步会获取什么？</summary><p>这是浏览器的主动共享授权，只做实时分析，不生成录音文件。浏览器同时请求标签页画面轨道，本站会禁用该轨道，不读取或展示画面，只在内存中分析声音。不使用麦克风，不保存或上传媒体。请勿选择含私密内容的其他标签页。可随时停止，离开页面也会结束共享。没有声音轨道、受保护的音频或不支持的浏览器，均不会用假频谱替代。</p></details>
  </section>;
}
