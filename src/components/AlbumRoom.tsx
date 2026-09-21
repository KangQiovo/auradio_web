import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {albums} from '../lib/albums.mjs';
import {extractCoverPalette, paletteFromRgb} from '../lib/palette.mjs';
import {useMotionPreference} from '../lib/useMotionPreference';
import {Icon} from './Icon';
import {applyAmbient} from '../lib/ambient.mjs';
import LiveSpectrum from './LiveSpectrum';

type Palette=ReturnType<typeof paletteFromRgb>;
/** Official playback is intentionally separate from the local-file audio analyser. */
export default function AlbumRoom({compact=false}:{compact?:boolean}){
  const [index,setIndex]=useState(0);
  const [palette,setPalette]=useState(()=>paletteFromRgb(albums[0].color));
  const [paletteStatus,setPaletteStatus]=useState('waiting');
  const [player,setPlayer]=useState(false);
  const [playerLoaded,setPlayerLoaded]=useState(false);
  const [artErrors,setArtErrors]=useState<Record<string,boolean>>({});
  const [selectedByUser,setSelectedByUser]=useState(false);
  const reduced=useMotionPreference();
  const root=useRef<HTMLElement>(null);
  const tabs=useRef<(HTMLButtonElement|null)[]>([]);
  const selection=useRef(0);
  const visible=useRef(false);
  const currentPalette=useRef(palette);
  const currentId=useRef(albums[0].id);
  const gesture=useRef<{x:number;y:number}|null>(null);
  const active=albums[index];
  const stop=()=>{setPlayer(false);setPlayerLoaded(false);};

  useEffect(()=>{
    // SSR images can fail before React attaches onError. Adopt that state after hydration.
    const failed:Record<string,boolean>={};
    root.current?.querySelectorAll<HTMLImageElement>('.album-art-plane img').forEach(image=>{
      const id=image.closest<HTMLElement>('[data-cover-id]')?.dataset.coverId;
      if(id&&image.complete&&image.naturalWidth===0)failed[id]=true;
    });
    if(Object.keys(failed).length)setArtErrors(previous=>({...previous,...failed}));
  },[active.id]);
  useEffect(()=>{
    const hash=new URLSearchParams(location.search).get('track');
    const found=albums.findIndex(a=>a.id===hash);
    if(found>=0)setIndex(found);
    const pause=()=>stop();
    window.addEventListener('auradio:local-play',pause);
    window.addEventListener('pagehide',pause);
    return()=>{window.removeEventListener('auradio:local-play',pause);window.removeEventListener('pagehide',pause);};
  },[]);
  useEffect(()=>{
    if(!root.current)return;
    const observer=new IntersectionObserver(([entry])=>{
      visible.current=entry.isIntersecting;
      if(entry.isIntersecting)applyAmbient(root.current?.closest<HTMLElement>('[data-album-scope]') ?? null,currentPalette.current,currentId.current);
    },{threshold:0.12});
    observer.observe(root.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const request=++selection.current;
    currentId.current=active.id;
    setPaletteStatus('loading');
    const fallback=paletteFromRgb(active.color);
    currentPalette.current=fallback;
    setPalette(fallback);
    if(visible.current)applyAmbient(root.current?.closest<HTMLElement>('[data-album-scope]') ?? null,fallback,active.id);
    void extractCoverPalette(active.artwork,active.color).then((result:unknown)=>{
      if(request!==selection.current)return;
      const {palette:p,extracted}=result as {palette:Palette;extracted:boolean};
      currentPalette.current=p;setPalette(p);setPaletteStatus(extracted?'extracted':'fallback');
      if(visible.current)applyAmbient(root.current?.closest<HTMLElement>('[data-album-scope]') ?? null,p,active.id);
    });
    return()=>{selection.current++;};
  },[active.id]);

  function choose(next:number,focus=false){
    next=(next+albums.length)%albums.length;
    stop();setSelectedByUser(true);setIndex(next);
    if(focus)tabs.current[next]?.focus({preventScroll:true});
    // Scroll only the rail, never scrollIntoView which could pull the entire page.
    const tab=tabs.current[next],rail=tab?.parentElement;
    if(tab&&rail)rail.scrollTo({left:tab.offsetLeft-rail.offsetLeft-16,behavior:reduced?'instant':'smooth'});
  }
  function openPlayer(){
    window.dispatchEvent(new Event('auradio:official-preview'));
    setPlayerLoaded(false);setPlayer(true);
  }
  const transition={duration:reduced?0:0.65,ease:[0.22,1,0.36,1] as [number,number,number,number]};
  return <section ref={root} className={`album-room ${compact?'album-room-compact':''}`} data-selected-album={active.id} data-palette-state={paletteStatus} style={{'--room-accent':palette.accent,'--room-dark':palette.dark,'--room-glow':palette.glow} as CSSProperties} aria-label="专辑与官方试听">
    <div className="album-room-top"><span>SELECTED RECORDS / G.E.M.</span><span>三首歌，三个片刻。</span></div>
    <div className="album-stage">
      <div className="album-art-stage" aria-label="当前专辑封面" onTouchStart={e=>{gesture.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{
        const start=gesture.current;gesture.current=null;if(!start)return;
        const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
        if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)choose(index+(dx<0?1:-1));
      }}>
        <div className="cover-halo" aria-hidden="true"/>
        <div className="album-art-stack">
          {/* Fixed layers make interrupted transitions reversible without exit-node accumulation. */}
          {albums.map(album=><motion.div key={album.id} className="album-art-plane" data-cover-id={album.id} aria-hidden={active.id!==album.id}
            initial={false} animate={{opacity:active.id===album.id?1:0,x:reduced||active.id===album.id?0:-18,rotate:reduced||active.id===album.id?0:-2}}
            style={{zIndex:active.id===album.id?2:1,pointerEvents:active.id===album.id?'auto':'none'}} transition={transition}>
            {artErrors[album.id]?<div className="cover-unavailable"><span>G.E.M.</span><strong>{album.title}</strong><small>封面暂不可用</small></div>:<img src={album.artwork} alt={`${album.album} · 专辑封面`} width="600" height="600" decoding="async" referrerPolicy="no-referrer" loading={active.id===album.id?'eager':'lazy'} onError={()=>setArtErrors(old=>({...old,[album.id]:true}))}/>}
          </motion.div>)}
        </div>
        <div className="album-art-footer"><span>{active.format}</span><div><button type="button" className="icon-button" aria-label="上一张专辑" onClick={()=>choose(index-1)}><Icon name="arrow" style={{transform:'rotate(180deg)'}}/></button><span aria-hidden="true">0{index+1} / 03</span><button type="button" className="icon-button" aria-label="下一张专辑" onClick={()=>choose(index+1)}><Icon name="arrow"/></button></div></div>
      </div>
      <div className="album-copy">
        <div className="album-heading-space" aria-live={selectedByUser?'polite':'off'}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div key={active.id} initial={{opacity:0,y:reduced?0:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-6}} transition={{...transition,duration:reduced?0:0.22}}>
              <span className="album-eyebrow">{active.label}</span>
              <h2>{active.title}</h2>
              <p className="album-artist">{active.artist}{active.id==='gem'&&<span>Get Everybody Moving</span>}</p>
              <p className="album-description" aria-hidden={!active.description}>{active.description}</p>
              <div className="album-source-title"><span>收录于</span><h3>{active.album}</h3></div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="official-preview" data-player-state={player?(playerLoaded?'frame-loaded':'loading'):'closed'}>
          {!player?<button type="button" className="button album-listen-button" onClick={openPlayer}><Icon name="play"/><span>打开官方试听</span><span className="preview-provider">{active.provider}</span></button>:<div className="official-frame-wrap">
            <div className="official-frame-caption"><span>{active.provider} · 官方播放器</span><button type="button" onClick={stop} aria-label="关闭官方试听"><Icon name="close"/></button></div>
            {!playerLoaded&&<span className="frame-loading" role="status">正在连接官方播放器…</span>}
            <iframe key={active.id} title={`${active.catalogTitle} · ${active.provider} 官方试听`} src={active.embedUrl} height={active.id==='freedom'?110:175} width="100%" allow="autoplay; encrypted-media; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation" referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setPlayerLoaded(true)}/>
          </div>}
          <p className="preview-scope">{active.previewNote}</p>
          <a className="official-source-link" href={active.sourceUrl} target="_blank" rel="noopener noreferrer">在 {active.provider} 打开作品 <Icon name="arrow"/></a>
          {player&&<p className="embed-help">播放器未显示或无法试听时，可通过上方链接前往官方平台。页面不会绕过平台限制。</p>}
        </div>
        <LiveSpectrum/>
      </div>
    </div>
    <div className="album-rail" role="tablist" aria-label="选择试听专辑" onKeyDown={e=>{
      let next:number|undefined;
      if(e.key==='ArrowRight'||e.key==='ArrowDown')next=index+1;
      if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=index-1;
      if(e.key==='Home')next=0;if(e.key==='End')next=albums.length-1;
      if(next!==undefined){e.preventDefault();choose(next,true);}
    }}>{albums.map((album,i)=><button key={album.id} ref={e=>{tabs.current[i]=e;}} type="button" role="tab" aria-selected={index===i} tabIndex={index===i?0:-1} aria-label={`选择 ${album.title}`} onClick={()=>choose(i)}>
      <span className="album-rail-art">{!artErrors[album.id]&&<img src={album.artwork} width="64" height="64" alt="" decoding="async" loading="lazy" referrerPolicy="no-referrer" onError={()=>setArtErrors(old=>({...old,[album.id]:true}))}/>}<i aria-hidden="true">0{i+1}</i></span>
      <span><b>{album.title}</b><small>{i===2?'Get Everybody Moving':album.album}</small></span><span className="album-rail-mark" aria-hidden="true">{i===index?'●':'↗'}</span>
    </button>)}</div>
    <p className="album-room-footnote">封面取色随选曲更新 · 频谱需主动同步声音 · 未经点击不加载第三方播放器 · 作品及封面权利归各自权利人，展示不代表艺人与 Auradio 存在合作。</p>
  </section>;
}
