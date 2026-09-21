import { useEffect, useId, useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import Icon from './Icon';
import { ListeningAudio } from '../lib/audio';
import { formatTime, validateAudioFile } from '../lib/playback.mjs';
import { useQuietMotion } from '../lib/preferences';
import type { SculptureState } from '../lib/scene';

const modes = ['涟漪', '交织', '回声'];
export default function ListeningRoom({ expanded = false }: { expanded?: boolean }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const audio = useRef<ListeningAudio | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const quiet = useQuietMotion();
  const [mode, setMode] = useState(0);
  const [strength, setStrength] = useState(.55);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(.35);
  const [title, setTitle] = useState('A little room');
  const [local, setLocal] = useState(false);
  const [status, setStatus] = useState('原创合成片段 · 点击后才会发声');
  const [webgl, setWebgl] = useState(false);
  const [focus, setFocus] = useState(false);
  const state = useRef<SculptureState>({ mode, strength, moving: false, analyser: null });
  state.current = { mode, strength, moving: !quiet, analyser: audio.current?.analyser ?? null };

  useEffect(() => {
    setReady(true);
    return () => audio.current?.dispose();
  }, []);
  useEffect(() => {
    let gone = false;
    let dispose: (() => void) | undefined;
    const host = canvasHost.current;
    if (!host) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      try {
        const { createSculpture } = await import('../lib/scene');
        if (gone) return;
        dispose = createSculpture(host, () => state.current, () => setWebgl(false));
        setWebgl(true);
      } catch {
        // A static line study keeps the page usable when WebGL is unavailable.
        if (!gone) setWebgl(false);
      }
    }, { rootMargin: '160px' });
    observer.observe(host);
    return () => { gone = true; observer.disconnect(); dispose?.(); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => setPosition(audio.current?.position ?? 0), 160);
    return () => window.clearInterval(interval);
  }, [playing]);
  useEffect(() => {
    const sync = () => setFocus(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  function getAudio() {
    if (!audio.current) {
      audio.current = new ListeningAudio();
      audio.current.setVolume(volume);
      audio.current.onEnd = () => { setPlaying(false); setPosition(audio.current?.duration ?? 0); };
    }
    return audio.current;
  }
  function report(error: unknown) {
    setStatus(error instanceof Error && error.message.includes('浏览器') ? error.message : '暂时无法播放这个音频，请尝试 MP3 / WAV，或恢复示例。');
  }
  async function toggle() {
    setBusy(true);
    try {
      const engine = getAudio();
      if (engine.playing) { engine.pause(); setPlaying(false); }
      else {
        await engine.play(); setPlaying(true); setDuration(engine.duration);
        setStatus(local ? '本地音频 · 仅在此浏览器播放，不上传' : '原创合成片段 · 仅用于网页体验');
      }
      setPosition(engine.position);
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }
  async function choose(file?: File) {
    if (!file) return;
    const validation = validateAudioFile(file);
    if (!validation.ok) { setStatus(validation.reason); return; }
    setBusy(true);
    try {
      const engine = getAudio();
      await engine.unlock();
      await engine.useFile(file);
      setTitle(file.name.replace(/\.[^.]+$/, ''));
      setLocal(true); setPlaying(false); setPosition(0); setDuration(engine.duration);
      setStatus('已在浏览器中读取 · 点击播放，不会上传文件');
    } catch (error) { report(error); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  function reset() {
    try {
      const engine = getAudio();
      engine.useDemo();
      setTitle('A little room'); setLocal(false); setPlaying(false); setPosition(0); setDuration(engine.duration);
      setStatus('原创合成片段 · 点击后才会发声');
    } catch (error) { report(error); }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setStatus('这个浏览器未提供全屏，请使用独立体验页。');
    } catch { setStatus('浏览器未允许全屏；其他操作不受影响。'); }
  }
  return <MotionConfig reducedMotion={quiet ? 'always' : 'never'}>
    <div className={`listening-room ${expanded ? 'expanded' : ''}`} ref={root} data-mode={mode} data-strength={strength} data-playing={playing} data-renderer={webgl ? 'webgl' : 'static'} aria-label="网页互动听音室">
      <div className="room-heading"><span className="mono">LISTENING ROOM</span><span>网页演示 · 非应用画面</span></div>
      <div className="sculpture-wrap">
        <div className="sculpture-fallback" data-visible={!webgl} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ transform: `translate(-50%,-50%) rotate(-28deg) scale(${.4 + i * .022},${.32 + i * .022})` }} />)}</div>
        <div className="sculpture" ref={canvasHost} />
        <div className="room-side-label mono" aria-hidden="true">SOUND, IN SHAPE.</div>
      </div>
      <div className="visual-options">
        <div className="mode-buttons" aria-label="视觉形态">{modes.map((name, i) => <button key={name} type="button" aria-pressed={mode === i} onClick={() => setMode(i)}>{mode === i && <motion.span className="mode-indicator" layoutId={`${id}-mode`} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}<span>{name}</span></button>)}</div>
        <button className="icon-button expand-control" aria-label={focus ? '退出全屏' : '全屏体验'} onClick={fullscreen}><Icon name={focus ? 'close' : 'expand'} /></button>
      </div>
      <div className="transport">
        <div className={`record-mini ${playing && !quiet ? 'spinning' : ''}`} aria-hidden="true"><span /></div>
        <div className="track-meta"><strong title={title}>{title}</strong><span>{local ? '你的本地音频' : 'Auradio · Web study 01'}</span></div>
        <button className="play-button" onClick={toggle} disabled={!ready || busy} aria-label={playing ? '暂停试听' : '开始试听'}><Icon name={playing ? 'pause' : 'play'} size={22} /></button>
      </div>
      <div className="seek-row"><time>{formatTime(position)}</time><input aria-label="播放进度" type="range" min="0" max={duration || 1} step=".1" disabled={!duration || busy} value={position} onChange={async event => { const value = Number(event.target.value); setPosition(value); try { await audio.current?.seek(value); } catch (error) { report(error); } }} /><time>{formatTime(duration)}</time></div>
      <div className="fine-controls">
        <label><Icon name="volume" size={16} /><span className="sr-only">音量</span><input aria-label="音量" type="range" min="0" max="1" step=".01" value={volume} onChange={event => { const value = Number(event.target.value); setVolume(value); audio.current?.setVolume(value); }} /></label>
        <label className="strength-control">律动<input aria-label="律动强度" type="range" min="0" max="1" step=".01" value={strength} onChange={event => setStrength(Number(event.target.value))} /></label>
        <button className="text-control" onClick={() => input.current?.click()} disabled={!ready || busy}><Icon name="upload" size={15} />本地音频</button>
        {local && <button className="text-control" onClick={reset} disabled={busy}>恢复示例</button>}
        <input ref={input} className="sr-only" tabIndex={-1} aria-label="选择本地音频文件" type="file" accept="audio/*,.flac,.opus" onChange={event => void choose(event.target.files?.[0])} />
      </div>
      <p className="room-status" role="status">{busy ? '正在准备音频…' : status}</p>
      <noscript><p className="room-status">互动试听需要 JavaScript；产品介绍与其他页面仍可直接阅读。</p></noscript>
    </div>
  </MotionConfig>;
}
