import '../styles/covers.css';
import {useState} from 'react';
import {motion,AnimatePresence} from 'motion/react';
import {Icon} from './Icon';
import {getPreviewItems} from '../lib/preview-library.mjs';
import {useMotionPreference} from '../lib/useMotionPreference';
const themes=[{id:'miuix',label:'MIUIX',copy:'清晰的分组，大方的留白。'},{id:'liquid',label:'Liquid',copy:'分层的表面，轻盈的控件。'},{id:'material',label:'Material 3',copy:'明确的层级，熟悉的操作。'}];
const tabs=['歌曲','专辑','艺术家'];
export default function ThemePreview() {
  const [selected,setSelected]=useState(themes[0]);
  const [tab,setTab]=useState('歌曲');
  const [query,setQuery]=useState('');
  const reduced=useMotionPreference();
  const filtered=getPreviewItems(tab,query);
  return <div className="theme-explorer">
    <div className="theme-options" role="group" aria-label="选择网页主题示意">
      {themes.map(t=><button key={t.id} aria-pressed={t.id===selected.id} onClick={()=>setSelected(t)}>{selected.id===t.id&&<motion.span className="theme-indicator" layoutId="theme-indicator" transition={{duration:reduced?0:0.25}}/>}<span>{t.label}</span></button>)}
    </div>
    <div className={`phone-preview theme-${selected.id}`}>
      <div className="phone-top"><span>auradio</span><span className="phone-menu" aria-hidden="true">···</span></div>
      <div className="phone-heading"><span>你的曲库</span><span>精选作品 · 网页示意</span></div>
      <label className="library-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索示例内容" aria-label="搜索示例曲库"/></label>
      <div className="library-tabs" role="group" aria-label="示例曲库分类">{tabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setQuery('');}}>{t}</button>)}</div>
      <AnimatePresence mode="wait" initial={false}><motion.div key={`${tab}-${selected.id}`} initial={{opacity:0,y:reduced?0:7}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:0.18}} className="library-items">
        {filtered.map((item,index)=><div key={item.id} className="library-item"><div className={`mini-cover cover-${index}`} aria-hidden="true"><span>{String(index+1).padStart(2,'0')}</span><img src={item.artwork} width="48" height="48" alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}}/></div><div><b>{item.title}</b><span>{item.subtitle}</span></div><span className="track-order">0{index+1}</span></div>)}
        {filtered.length===0&&<p className="empty-library">没有匹配的示例内容。</p>}
      </motion.div></AnimatePresence>
      <div className="phone-dock"><div className="tiny-art" aria-hidden="true"/><div><b>还未开始播放</b><span>网页主题与曲库示意</span></div><Icon name="play"/></div>
    </div>
    <p className="theme-caption" aria-live="polite">{selected.copy}<span>当前为网页交互示意，不是客户端实拍。</span></p>
  </div>;
}
