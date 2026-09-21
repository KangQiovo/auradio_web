import {useState} from 'react';
import SoundField from './SoundField';
import {useMotionPreference} from '../lib/useMotionPreference';
export default function HeroField() {
  const [animated,setAnimated]=useState(true);
  const reduced=useMotionPreference();
  return <div className="hero-field-frame">
    <div className="field-topline"><span>声场研究 / 01</span><span>INTERACTIVE STUDY</span></div>
    <SoundField animated={animated}/>
    <div className="field-bottomline"><span><i className="status-dot"/>网页视觉实验 · 非客户端截图</span><button type="button" aria-pressed={!animated} onClick={()=>setAnimated(!animated)} disabled={reduced}>{reduced?'减少动态已开启':animated?'静止片刻':'让它流动'}</button></div>
  </div>;
}
