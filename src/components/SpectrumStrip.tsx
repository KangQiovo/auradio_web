import {useEffect, useRef} from 'react';
import {readAudioFrame, subscribeSignal, useSignalKind} from '../lib/audio-signal';
import {relax} from '../lib/spectrum.mjs';
import {useMotionPreference} from '../lib/useMotionPreference';
/** Real 64-band meter; rAF data stays outside React and all buffers are reused. */
export default function SpectrumStrip() {
  const canvas = useRef<HTMLCanvasElement>(null), caption = useRef<HTMLSpanElement>(null);
  const reduced = useMotionPreference(), kind = useSignalKind();
  useEffect(() => {
    const element = canvas.current, label = caption.current;
    if (!element || !label) return;
    const ctx = element.getContext('2d'); if (!ctx) return;
    let raf = 0, visible = false, last = 0, lastLabel = 0, width = 1, height = 70;
    let color = '#a5d5bb';
    const bars = new Float32Array(64);
    function draw(now: number) {
      raf = 0;
      if (!visible || document.hidden || !element || !ctx || !label) return;
      const signal = readAudioFrame(now), dt = Math.min((now - (last || now - 16)) / 1000, 0.05); last = now;
      let remaining = false;
      ctx.clearRect(0, 0, width, height); ctx.fillStyle = color;
      for (let i = 0; i < 64; i++) {
        const v = reduced ? 0 : signal.bands[i];
        bars[i] = relax(bars[i], v, dt, v > bars[i] ? 0.025 : 0.14);
        if (bars[i] < 0.001) bars[i] = 0;
        remaining ||= bars[i] > 0;
        const h = 1 + bars[i] * (height - 7), step = width / 64;
        ctx.globalAlpha = 0.45 + bars[i] * 0.55;
        ctx.fillRect(i * step, height - h, Math.max(1, step - 2), h);
      }
      ctx.globalAlpha = 1;
      if (now - lastLabel > 180 || reduced) {
        lastLabel = now;
        label.textContent = reduced ? '减少动态已开启' : !signal.active ? '等待音频信号' : signal.rms > 0.006 ? '实时频谱 · 64 个频段' : '已连接 · 当前无音频信号';
        element.dataset.rms = signal.rms.toFixed(4);
        element.dataset.peakBand = String(bars.indexOf(Math.max(...bars)));
        color = getComputedStyle(element).color;
      }
      if (!reduced && (signal.active || remaining)) raf = requestAnimationFrame(draw);
    }
    const wake = () => {if (visible && !document.hidden && !raf) raf = requestAnimationFrame(draw);};
    const visibility = () => {if (document.hidden) {cancelAnimationFrame(raf);raf = 0;last = 0;} else wake();};
    const resize = new ResizeObserver(() => {
      width = Math.max(1, element.clientWidth); height = Math.max(1, element.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); wake();
    }); resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {cancelAnimationFrame(raf);raf = 0;last = 0;} else wake();
    }); observer.observe(element);
    const unsubscribe = subscribeSignal(wake);
    document.addEventListener('visibilitychange', visibility);
    return () => {cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();unsubscribe();document.removeEventListener('visibilitychange', visibility);};
  }, [reduced, kind]);
  return <div className="spectrum-strip" data-source={kind}>
    <canvas ref={canvas} role="img" aria-label="当前实际声音的 64 频段频谱，无音频时不模拟波动"/>
    <div className="spectrum-caption"><span ref={caption}>等待音频信号</span><span aria-hidden="true">低频 — 高频</span></div>
  </div>;
}
