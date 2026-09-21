import {useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {providers} from '../lib/content.mjs';
import {useMotionPreference} from '../lib/useMotionPreference';
import {Icon} from './Icon';
export default function ProviderExplorer() {
  const [selected,setSelected]=useState(providers[0]);
  const reduced=useMotionPreference();
  return <div className="provider-explorer">
    <div className="provider-rail" role="group" aria-label="查看音乐平台入口边界">{providers.map(p=><button key={p.id} aria-pressed={p.id===selected.id} onClick={()=>setSelected(p)}><span className="provider-letter">{p.letter}</span><span>{p.name}</span><Icon name="arrow"/></button>)}</div>
    <div className="provider-detail" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.div key={selected.id} initial={{opacity:0,y:reduced?0:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:0.15}}><span className="overline">{selected.mode}</span><h3>{selected.name}</h3><p>{selected.detail}</p><div className="provider-boundary"><Icon name="close"/><span>不是原生账号连接<br/>不代表歌单、会员或下载接入</span></div></motion.div></AnimatePresence><p className="small-note">Android 8.0 / 8.1 使用官方 Custom Tab 回退。这里仅解释客户端入口，不在官网发起登录。</p></div>
  </div>;
}
