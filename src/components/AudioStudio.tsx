import {useCallback,useEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import SoundField from './SoundField';
import {Icon} from './Icon';
import {useMotionPreference} from '../lib/useMotionPreference';
import {clamp,formatTime,validateAudio,getTrackTitle} from '../lib/audio.mjs';
import {route} from '../lib/urls';
import type {FieldMode} from '../lib/field';
interface Track {id:string;title:string;subtitle:string;url:string;local?:boolean}
const samples:Track[]=[
  {id:'daylight',title:'日光之间',subtitle:'柔和和弦 / 合成试听',url:route('audio/daylight.wav')},
  {id:'closer',title:'慢慢靠近',subtitle:'短音与回声 / 合成试听',url:route('audio/closer.wav')},
  {id:'midnight',title:'午夜留白',subtitle:'低频与节拍 / 合成试听',url:route('audio/midnight.wav')},
];
const modes:{id:FieldMode;name:string;description:string}[]=[{id:'ribbon',name:'流线',description:'交叠的线条，随声音缓慢展开。'},{id:'orbit',name:'环形',description:'沿着同一个中心，观察起伏。'},{id:'wave',name:'波面',description:'让声音的强弱落在一张平面上。'}];
export default function AudioStudio() {
  const [track,setTrack]=useState<Track>(samples[0]);
  const [playing,setPlaying]=useState(false);
  const [duration,setDuration]=useState(0);
  const [position,setPosition]=useState(0);
  const [volume,setVolume]=useState(0.45);
  const [mode,setMode]=useState<FieldMode>('ribbon');
  const [intensity,setIntensity]=useState(0.55);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [analysisAvailable,setAnalysisAvailable]=useState(true);
  const reduced=useMotionPreference();
  const audio=useRef<HTMLAudioElement>(null);
  const root=useRef<HTMLDivElement>(null);
  const context=useRef<AudioContext|null>(null);
  const analyser=useRef<AnalyserNode|null>(null);
  const source=useRef<MediaElementAudioSourceNode|null>(null);
  const bins=useRef(new Uint8Array(128));
  const objectUrl=useRef<string|null>(null);
  const requestId=useRef(0);
  const resetLocalOnRestore=useRef(false);
  useEffect(()=>{
    const a=audio.current;
    if(a && a.getAttribute('src')!==track.url){a.src=track.url;a.load();}
  },[track.url]);
  useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
  useEffect(()=>{
    const leave=()=>{
      requestId.current++;audio.current?.pause();
      if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current=null;resetLocalOnRestore.current=true;audio.current?.removeAttribute('src');audio.current?.load();}
      if(context.current?.state==='running')void context.current.suspend();
    };
    const restore=(event:PageTransitionEvent)=>{
      if(event.persisted && resetLocalOnRestore.current){resetLocalOnRestore.current=false;selectTrack(samples[0]);setNotice('已释放离开页面前选择的本地音频，请重新选择文件。');}
    };
    window.addEventListener('pagehide',leave);window.addEventListener('pageshow',restore);
    return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',restore);};
  },[]);
  useEffect(()=>()=>{
    requestId.current++;
    source.current?.disconnect();analyser.current?.disconnect();
    if(context.current) void context.current.close();
    if(objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  },[]);
  async function startPlayback() {
    const a=audio.current;if(!a)return;
    const request=++requestId.current;
    setError('');
    try {
      if(!context.current && typeof AudioContext!=='undefined') {
        const c=new AudioContext();context.current=c;
        const analysis=c.createAnalyser();analysis.fftSize=256;analysis.smoothingTimeConstant=0.82;
        const node=c.createMediaElementSource(a);node.connect(analysis);analysis.connect(c.destination);
        analyser.current=analysis;source.current=node;
      }
      if(context.current?.state==='suspended')await context.current.resume();
      if(!context.current)setAnalysisAvailable(false);
    } catch {setAnalysisAvailable(false);}
    if(request!==requestId.current)return;
    try{await a.play();}catch{if(request===requestId.current)setError('暂时无法播放。请再次点击播放，或换一个浏览器支持的音频文件。');}
  }
  function togglePlay(){
    if(!audio.current)return;
    if(audio.current.paused)void startPlayback();
    else{requestId.current++;audio.current.pause();}
  }
  function selectTrack(next:Track,autoplay=false) {
    const a=audio.current;requestId.current++;
    a?.pause();setPosition(0);setDuration(0);setError('');setNotice('');
    if(objectUrl.current && objectUrl.current!==next.url){URL.revokeObjectURL(objectUrl.current);objectUrl.current=null;}
    setTrack(next);
    if(a){a.src=next.url;a.load();if(autoplay)void startPlayback();}
  }
  function selectFile(file:File|undefined) {
    if(!file)return;
    const invalid=validateAudio(file);if(invalid){setError(invalid);return;}
    const url=URL.createObjectURL(file);
    selectTrack({id:'local',title:getTrackTitle(file.name),subtitle:'你的本地音频 · 仅在当前页面播放',url,local:true});
    objectUrl.current=url;
  }
  const level=useCallback(()=>{
    if(!analyser.current || audio.current?.paused)return 0;
    analyser.current.getByteFrequencyData(bins.current);
    let sum=0;for(const value of bins.current)sum+=value;
    return Math.min(2,sum/bins.current.length/42);
  },[]);
  async function fullscreen(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(root.current?.requestFullscreen)await root.current.requestFullscreen();
      else setNotice('当前浏览器不支持全屏模式，仍可直接使用页面中的体验室。');
    }catch{setNotice('浏览器没有允许全屏显示。页面中的播放和设置仍然可以使用。');}
  }
  const nextTrack=()=>selectTrack(samples[(samples.findIndex(t=>t.id===track.id)+1)%samples.length],playing);
  return <div className="audio-studio" ref={root}>
    <div className="studio">
      <div className="studio-view">
        <div className="studio-view-top"><span><i className={`status-dot ${playing?'on':''}`}/>{playing?'正在播放': '等待播放'}</span><button className="icon-button" onClick={()=>void fullscreen()} aria-label="切换体验室全屏"><Icon name="expand"/></button></div>
        <SoundField mode={mode} intensity={intensity} animated={playing} level={level}/>
        <div className="studio-track"><div><span className="overline">{track.local?'LOCAL AUDIO':'AURADIO STUDIO / ORIGINAL SYNTHESIS'}</span><h2>{track.title}</h2><p>{track.subtitle}</p></div><span className="studio-track-number" aria-hidden="true">{track.local?'L':`0${samples.findIndex(t=>t.id===track.id)+1}`}</span></div>
        <div className="transport">
          <label className="seek-label"><span className="sr-only">播放进度</span><input type="range" aria-label="播放进度" min="0" max={duration||1} step="0.05" value={Math.min(position,duration||1)} disabled={!duration} onChange={e=>{const v=clamp(e.target.valueAsNumber,0,duration);if(audio.current)audio.current.currentTime=v;setPosition(v);}}/></label>
          <div className="transport-row"><span className="time-label">{formatTime(position)}<span> / {formatTime(duration)}</span></span><div className="play-buttons"><button className="play-button" aria-label={playing?'暂停试听':'播放试听'} onClick={togglePlay}><Icon name={playing?'pause':'play'}/></button><button className="icon-button" aria-label="下一段合成试听" onClick={nextTrack}><Icon name="next"/></button></div><label className="volume-label"><Icon name="volume"/><input aria-label="音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(e.target.valueAsNumber)}/></label></div>
        </div>
      </div>
      <aside className="studio-controls" aria-label="声场设置">
        <span className="overline">按你的方式来</span><h3>调一调，<br/>听听变化。</h3><p>试听真实播放，线条跟随音频强弱起伏。形态与强度只改变画面，不改变声音。</p>
        <fieldset className="mode-options"><legend>声场形态</legend>{modes.map(m=><button key={m.id} type="button" aria-pressed={mode===m.id} onClick={()=>setMode(m.id)}>{mode===m.id&&<motion.span layoutId="field-mode" className="mode-selected" transition={{duration:reduced?0:0.2}}/>}<span>{m.name}</span>{mode===m.id&&<Icon name="check"/>}</button>)}</fieldset>
        <p className="mode-description" aria-live="polite">{modes.find(m=>m.id===mode)?.description}</p>
        <label className="intensity-label"><span>响应强度 <output>{Math.round(intensity*100)}%</output></span><input aria-label="响应强度" type="range" min="0" max="1" step="0.01" value={intensity} disabled={reduced} onChange={e=>setIntensity(e.target.valueAsNumber)}/></label>
        <div className="studio-limit"><span>{reduced?'减少动态已开启':'声音由你开启'}</span><p>{reduced?'声场保持静止，播放控制照常可用。':'初始音量 45%，不会自动出声。先从你舒服的音量开始。'}</p></div>
      </aside>
    </div>
    <div className="audio-feedback" aria-live="polite">{error&&<p className="error-message" role="alert">{error}</p>}{notice&&<p>{notice}</p>}{!analysisAvailable&&<p>浏览器未能启用音频分析；播放仍可使用，当前画面不是实时音频响应。</p>}</div>
    <div className="source-heading"><h3>从一段声音开始</h3><span>官网原创合成试听 · 不是在线曲库</span></div>
    <div className="sample-list" role="group" aria-label="选择合成试听">{samples.map((t,i)=><button key={t.id} className="sample-option" aria-pressed={t.id===track.id} onClick={()=>selectTrack(t,playing)}><span className={`sample-cover cover-${i}`} aria-hidden="true">0{i+1}</span><span><b>{t.title}</b><small>{t.subtitle}</small></span><span className="sample-selected">{track.id===t.id?<Icon name="check"/>:<Icon name="arrow"/>}</span></button>)}</div>
    <div className="local-file"><div><h3>也可以，听你自己的。</h3><p>选择一个本地音频，文件不经本站代码上传。支持 MP3、WAV 等常见格式，单个文件不超过 100 MiB。</p></div><label className="button button-outline file-button"><Icon name="upload"/><span>选择本地音频</span><input type="file" accept=".mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,audio/*" aria-label="选择本地音频" onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}}/></label></div>
    <audio ref={audio} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onLoadedMetadata={()=>setDuration(clamp(audio.current?.duration??0,0,86400))} onTimeUpdate={()=>setPosition(audio.current?.currentTime??0)} onError={()=>{setPlaying(false);setDuration(0);setError('浏览器未能读取这段音频。请换用兼容格式，或重新选择文件。');}}/>
  </div>;
}
