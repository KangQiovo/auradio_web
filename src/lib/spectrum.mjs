/** Log-frequency projection; reusable buffers keep render frames allocation-free. */
export function makeBandRanges(sampleRate, fftSize, count = 64) {
  const top = Math.min(16000, sampleRate / 2), bottom = Math.min(45, top / 2);
  const size = fftSize / 2, binHz = sampleRate / fftSize;
  return Array.from({length: count}, (_, i) => {
    const start = Math.min(size - 1, Math.max(1, Math.floor(bottom * (top / bottom) ** (i / count) / binHz)));
    const end = Math.min(size, Math.max(start + 1, Math.ceil(bottom * (top / bottom) ** ((i + 1) / count) / binHz)));
    return [start, end];
  });
}
export function projectSpectrum(bins, ranges, out) {
  for (let i = 0; i < out.length; i++) {
    const [start, end] = ranges[i];
    let sum = 0, peak = 0;
    for (let j = start; j < end; j++) {
      const v = (bins[j] || 0) / 255;
      sum += v * v; peak = Math.max(peak, v);
    }
    out[i] = (0.6 * peak + 0.4 * Math.sqrt(sum / (end - start))) ** 1.6;
  }
  return out;
}
export function relax(value, target, dt, seconds) {
  return target + (value - target) * Math.exp(-Math.max(0, dt) / Math.max(0.001, seconds));
}
export function shouldAnimateField({visible, reduced, playing, idleMotion, interaction, settling}) {
  return Boolean(visible && !reduced && (playing || idleMotion || interaction > 0.001 || settling));
}
