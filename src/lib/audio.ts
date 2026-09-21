import { clamp, safeSeek } from './playback.mjs';

/** Website-only audio. No app code, remote media, microphone or network access. */
export class ListeningAudio {
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;
  private gain: GainNode;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private offset = 0;
  playing = false;
  onEnd: (() => void) | undefined;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) throw new Error('此浏览器暂不支持网页音频，请换用支持 Web Audio 的浏览器。');
    this.context = new AudioContextClass();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = .85;
    this.gain = this.context.createGain();
    this.gain.gain.value = .35;
    this.analyser.connect(this.gain);
    this.gain.connect(this.context.destination);
  }
  get duration() { return this.buffer?.duration ?? 0; }
  get position() { return safeSeek(this.offset + (this.playing ? this.context.currentTime - this.startedAt : 0), this.duration); }
  setVolume(value: number) { this.gain.gain.setTargetAtTime(clamp(value, 0, 1), this.context.currentTime, .025); }
  async unlock() { if (this.context.state === 'suspended') await this.context.resume(); }
  useDemo() {
    this.pause();
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(2, sampleRate * 28, sampleRate);
    // Original four-chord ambient sketch, synthesized locally on demand.
    const chords = [[130.81, 164.81, 196], [110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83]];
    for (let channel = 0; channel < 2; channel++) {
      const out = buffer.getChannelData(channel);
      for (let i = 0; i < out.length; i++) {
        const t = i / sampleRate;
        const chord = chords[Math.min(3, Math.floor(t / 7))];
        const phase = t % 7;
        const envelope = Math.min(1, phase / .8) * Math.min(1, (7 - phase) / 1.7);
        let value = 0;
        for (let n = 0; n < chord.length; n++) {
          const f = chord[n] * (channel ? 1.001 : 1);
          value += Math.sin(t * f * Math.PI * 2) * .038;
          value += Math.sin(t * f * 2 * Math.PI * 2) * .012;
        }
        const step = Math.floor(t * 2) % 3;
        const bell = Math.sin(t * chord[step] * 4 * Math.PI * 2) * Math.exp(-(t % .5) * 8) * .027;
        const fade = Math.min(1, t / .4, (28 - t) / .8);
        out[i] = (value * envelope + bell) * fade;
      }
    }
    this.buffer = buffer;
    this.offset = 0;
  }
  async useFile(file: File) {
    const bytes = await file.arrayBuffer();
    const decoded = await this.context.decodeAudioData(bytes);
    if (!decoded.duration || decoded.duration > 60 * 30) throw new Error('请选择 30 分钟以内的音频。');
    this.pause();
    this.buffer = decoded;
    this.offset = 0;
  }
  async play() {
    if (this.playing) return;
    await this.unlock();
    if (!this.buffer) this.useDemo();
    if (this.offset >= this.duration) this.offset = 0;
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.analyser);
    this.source = source;
    this.startedAt = this.context.currentTime;
    this.playing = true;
    source.onended = () => {
      if (this.source !== source) return;
      this.offset = this.duration;
      this.playing = false;
      this.source = null;
      source.disconnect();
      this.onEnd?.();
    };
    source.start(0, this.offset);
  }
  pause() {
    this.offset = this.position;
    this.playing = false;
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }
  async seek(position: number) {
    const resume = this.playing;
    this.pause();
    this.offset = safeSeek(position, this.duration);
    if (resume) await this.play();
  }
  dispose() {
    this.pause();
    this.buffer = null;
    this.analyser.disconnect();
    this.gain.disconnect();
    void this.context.close();
  }
}
