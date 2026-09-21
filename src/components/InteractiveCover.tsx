import '../styles/covers.css';
import {useEffect,useRef,type ReactNode,type PointerEvent as ReactPointerEvent} from 'react';
import {motion,useSpring} from 'motion/react';
import {coverPose,horizontalStep} from '../lib/cover-interaction.mjs';
import {useMotionPreference} from '../lib/useMotionPreference';
const spring={stiffness:210,damping:24,mass:0.65};
interface Props {children:ReactNode;recordId:string;title:string;onStep:(delta:number)=>void}
/** Reversible, event-driven transforms. No per-frame React state or permanent render loop. */
export default function InteractiveCover({children,recordId,title,onStep}:Props) {
  const root=useRef<HTMLDivElement>(null);
  const gesture=useRef<{id:number;x:number;y:number}|null>(null);
  const reduced=useMotionPreference();
  const rx=useSpring(0,spring),ry=useSpring(0,spring),scale=useSpring(1,spring);
  const lightX=useSpring(0,spring),lightY=useSpring(0,spring),shine=useSpring(0,{stiffness:170,damping:25});
  const pulseTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function reset(immediate=false) {
    gesture.current=null;
    if(pulseTimer.current){clearTimeout(pulseTimer.current);pulseTimer.current=null;}
    for(const value of [rx,ry,lightX,lightY,shine])immediate?value.jump(0):value.set(0);
    immediate?scale.jump(1):scale.set(1);
    if(root.current)root.current.dataset.coverState='rest';
  }
  useEffect(()=>{reset(true);},[recordId,reduced]);
  useEffect(()=>{
    const leave=()=>reset(true);
    const visibility=()=>{if(document.hidden)leave();};
    window.addEventListener('blur',leave);window.addEventListener('pagehide',leave);
    document.addEventListener('visibilitychange',visibility);
    return()=>{
      if(pulseTimer.current)clearTimeout(pulseTimer.current);
      window.removeEventListener('blur',leave);window.removeEventListener('pagehide',leave);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[]);
  function aim(e:ReactPointerEvent<HTMLDivElement>) {
    if(reduced || (e.pointerType!=='mouse'&&!gesture.current))return;
    const pose=coverPose(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect(),e.pointerType!=='mouse');
    rx.set(pose.rotateX);ry.set(pose.rotateY);lightX.set(pose.lightX);lightY.set(pose.lightY);shine.set(1);
    e.currentTarget.dataset.coverState=gesture.current?'pressed':'hover';
  }
  function press(e:ReactPointerEvent<HTMLDivElement>) {
    if(!e.isPrimary || e.button!==0)return;
    gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if(!reduced){aim(e);scale.set(0.97);e.currentTarget.dataset.coverState='pressed';}
  }
  function release(e:ReactPointerEvent<HTMLDivElement>) {
    const g=gesture.current;
    if(!g || g.id!==e.pointerId)return;
    const step=horizontalStep(e.clientX-g.x,e.clientY-g.y);
    if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    reset(reduced);
    if(step)onStep(step);
  }
  function tap() {
    if(reduced)return;
    reset();rx.set(-3);ry.set(3);scale.set(0.97);shine.set(1);
    if(root.current)root.current.dataset.coverState='pressed';
    pulseTimer.current=setTimeout(()=>reset(),130);
  }
  return <div ref={root} className="album-art-stack cover-interaction" data-cover-state="rest" data-reduced={reduced?'true':'false'}
    role="button" tabIndex={0} aria-label={`${title} · 互动专辑封面`} aria-description="移动光标感受倾斜，轻触回弹；左右滑动或方向键切换专辑。回车和空格触发视觉反馈，不播放音乐。"
    onPointerMove={aim} onPointerDown={press} onPointerUp={release} onPointerCancel={()=>reset(reduced)}
    onLostPointerCapture={()=>reset(reduced)} onPointerLeave={()=>{if(!gesture.current)reset(reduced);}} onBlur={()=>reset(reduced)}
    onKeyDown={e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();reset(reduced);onStep(e.key==='ArrowRight'?1:-1);}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)tap();}
      else if(e.key==='Escape')reset(reduced);
    }}>
    <motion.div className="cover-tilt" style={{rotateX:rx,rotateY:ry,scale}}>
      {children}
      <div className="cover-light-clip" aria-hidden="true"><motion.div className="cover-light" style={{x:lightX,y:lightY,opacity:shine}}/></div>
    </motion.div>
  </div>;
}
