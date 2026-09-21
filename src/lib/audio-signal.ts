import {useSyncExternalStore} from 'react';
import {makeBandRanges, projectSpectrum} from './spectrum.mjs';
export type SignalKind = 'none' | 'local' | 'tab';
export interface AudioFrame {bands: Float32Array; waveform: Float32Array; rms: number; active: boolean}
const frame: AudioFrame = {bands: new Float32Array(64), waveform: new Float32Array(2048), rms: 0, active: false};
let probe: {owner: object; analyser: AnalyserNode; active: () => boolean; bins: Uint8Array<ArrayBuffer>; ranges: number[][]; kind: SignalKind} | null = null;
let lastRead = -Infinity;
const listeners = new Set<() => void>();
export const getSignalKind = (): SignalKind => probe?.kind ?? 'none';
export function subscribeSignal(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};}
export function refreshSignal() {lastRead = -Infinity; listeners.forEach(fn => fn());}
export function useSignalKind() {return useSyncExternalStore(subscribeSignal, getSignalKind, () => 'none' as const);}
/** A single source feeds every visible spectrum/field in this document. No React updates per frame. */
export function attachSignal(owner: object, analyser: AnalyserNode, active: () => boolean, kind: SignalKind) {
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.35;
  analyser.minDecibels = -85; analyser.maxDecibels = -15;
  probe = {owner, analyser, active, kind, bins: new Uint8Array(analyser.frequencyBinCount), ranges: makeBandRanges(analyser.context.sampleRate, analyser.fftSize, 64)};
  frame.waveform = new Float32Array(analyser.fftSize);
  refreshSignal();
}
export function detachSignal(owner: object) {
  if (probe?.owner !== owner) return;
  probe = null; frame.bands.fill(0); frame.waveform.fill(0); frame.rms = 0; frame.active = false; refreshSignal();
}
export function readAudioFrame(now: number): AudioFrame {
  if (now - lastRead < 7) return frame;
  lastRead = now;
  frame.active = Boolean(probe && probe.active() && probe.analyser.context.state === 'running');
  if (!probe || !frame.active) {frame.bands.fill(0); frame.waveform.fill(0); frame.rms = 0; return frame;}
  probe.analyser.getByteFrequencyData(probe.bins);
  probe.analyser.getFloatTimeDomainData(frame.waveform as Float32Array<ArrayBuffer>);
  projectSpectrum(probe.bins, probe.ranges, frame.bands);
  let energy = 0;
  for (let i = 0; i < frame.waveform.length; i++) energy += frame.waveform[i] ** 2;
  frame.rms = Math.min(1, Math.sqrt(energy / frame.waveform.length) * 3);
  return frame;
}
