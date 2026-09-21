import {attachSignal, detachSignal} from './audio-signal';
let pending = 0;
let dispose: (() => void) | null = null;
export function canSyncTabAudio() {
  return typeof window !== 'undefined' && window.isSecureContext && Boolean(navigator.mediaDevices?.getDisplayMedia);
}
export function stopTabAudio() {pending++; dispose?.(); dispose = null;}
/** Explicit browser permission only. No microphone, MediaRecorder, uploads or cross-origin DOM access. */
export async function startTabAudio() {
  if (!canSyncTabAudio()) throw new Error('当前浏览器不支持标签页声音共享。手机可选择本地音频体验真实频谱，触控交互仍可直接使用。');
  stopTabAudio();
  const request = ++pending;
  const owner = {};
  let stream: MediaStream | null = null, context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null, analyser: AnalyserNode | null = null;
  const cleanup = () => {
    detachSignal(owner);
    stream?.getTracks().forEach(track => track.stop());
    source?.disconnect(); analyser?.disconnect();
    if (context && context.state !== 'closed') void context.close();
    window.removeEventListener('pagehide', stopTabAudio);
    window.removeEventListener('auradio:local-play', stopTabAudio);
  };
  try {
    // The standard requires a video track alongside audio. Never read/display/store its pixels.
    // The browser picker remains in control; reject windows/monitors even when hints are ignored.
    const options = {
      video: {displaySurface: 'browser', width: {ideal: 8}, height: {ideal: 8}, frameRate: {ideal: 1, max: 1}},
      audio: {suppressLocalAudioPlayback: false, restrictOwnAudio: false, autoGainControl: false, echoCancellation: false, noiseSuppression: false},
      preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'exclude',
      surfaceSwitching: 'exclude', monitorTypeSurfaces: 'exclude',
    };
    stream = await navigator.mediaDevices.getDisplayMedia(options as DisplayMediaStreamOptions);
    if (request !== pending) {cleanup(); return;}
    const video = stream.getVideoTracks()[0], audio = stream.getAudioTracks()[0];
    if (video?.getSettings().displaySurface !== 'browser') throw new Error('请只选择当前 Auradio 标签页，不共享窗口或整个屏幕。此次共享已停止。');
    if (!audio) throw new Error('没有收到声音轨道。请重试并勾选“分享标签页音频”；浏览器不支持时可使用本地音频。');
    video.enabled = false;
    context = new AudioContext();
    source = context.createMediaStreamSource(new MediaStream([audio]));
    analyser = context.createAnalyser();
    source.connect(analyser); // Analysis only: never connect captured audio to speakers (avoids echo).
    await context.resume();
    if (request !== pending) {cleanup(); return;}
    attachSignal(owner, analyser, () => audio.readyState === 'live' && audio.enabled, 'tab');
    dispose = cleanup;
    stream.getTracks().forEach(track => track.addEventListener('ended', stopTabAudio, {once: true}));
    window.addEventListener('pagehide', stopTabAudio, {once: true});
    window.addEventListener('auradio:local-play', stopTabAudio, {once: true});
  } catch (error) {
    cleanup();
    if (request !== pending) return;
    if (error instanceof DOMException && error.name === 'NotAllowedError') throw new Error('未获得声音共享权限。歌曲照常播放，画面不会伪造频谱；可再次主动开启。');
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('声音共享已取消，歌曲播放不受影响。');
    throw error;
  }
}
