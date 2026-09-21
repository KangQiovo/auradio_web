import { useEffect, useMemo, useRef, useState } from 'react';
import { useMotionPreference } from '../lib/useMotionPreference';
import type { FieldMode, FieldSettings } from '../lib/field';
interface Props {mode?:FieldMode;intensity?:number;animated?:boolean;className?:string}
export default function SoundField({mode='ribbon',intensity=0.55,animated=true,className=''}:Props) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<{sync:()=>void;destroy:()=>void} | null>(null);
  const reduced = useMotionPreference();
  const settings = useRef<FieldSettings>({mode,intensity,animated,reduced});
  const [ready,setReady] = useState(false);
  const [failed,setFailed] = useState(false);
  useEffect(() => {settings.current={mode,intensity,animated,reduced};instance.current?.sync();},[mode,intensity,animated,reduced]);
  useEffect(() => {
    const element=host.current;
    if(!element) return;
    let cancelled=false;
    const unavailable=()=>{setReady(false);setFailed(true);};
    element.addEventListener('field-unavailable',unavailable);
    const observer=new IntersectionObserver(async ([entry]) => {
      if(!entry.isIntersecting) return;
      observer.disconnect();
      try {
        const {createField}=await import('../lib/field');
        if(cancelled) return;
        instance.current=createField(element,()=>settings.current);
        setReady(true);
      } catch { if(!cancelled) unavailable(); }
    },{rootMargin:'100px'});
    observer.observe(element);
    return()=>{cancelled=true;observer.disconnect();instance.current?.destroy();instance.current=null;element.removeEventListener('field-unavailable',unavailable);};
  },[]);
  const lines=useMemo(()=>Array.from({length:38},(_,i)=>{
    const band=i/37; const points=Array.from({length:85},(_,j)=>{
      const a=j/84*Math.PI*2;
      return `${(300+220*Math.sin(a)).toFixed(1)},${(215+(band-0.5)*120+65*Math.sin(2*a+(band*2-1)*1.35)).toFixed(1)}`;
    });
    return <polyline key={i} points={points.join(' ')} fill="none" stroke={i<20?'#43c6a2':'#ceddcf'} strokeWidth="0.9" opacity="0.7"/>;
  }),[]);
  return <div className={`sound-field ${className}`} role="group" aria-label={failed?'静态声场插图，当前浏览器无法呈现 WebGL 交互':'由线条构成的可交互声场，网页视觉实验'}>
    <svg className={`field-fallback ${ready?'is-hidden':''}`} viewBox="0 0 600 430" aria-hidden="true">{lines}</svg>
    <div ref={host} className="field-canvas" tabIndex={ready && !reduced ? 0 : -1} role="button" aria-disabled={reduced || !ready} aria-label="互动声场：滑动鼠标或手指拨散线条；键盘方向键、回车或空格也可操作"/>
    {failed ? <span className="field-status">静态兼容模式</span> : <span className="field-interaction-hint">{reduced ? '减少动态已开启' : '移动或轻触，拨散再聚合'}</span>}
  </div>;
}
