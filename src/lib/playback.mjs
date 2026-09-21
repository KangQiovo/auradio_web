/** @param {number} value @param {number} min @param {number} max */
export function clamp(value, min, max) { return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min; }
/** @param {number} value */
export function formatTime(value) { const s = Math.floor(Math.max(0, Number.isFinite(value) ? value : 0)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
/** @param {number} value @param {number} duration */
export function safeSeek(value, duration) { return clamp(value, 0, Number.isFinite(duration) ? Math.max(0, duration) : 0); }
/** @param {{size: number, type: string, name: string}} file */
export function validateAudioFile(file) {
  if (!file.size) return { ok: false, reason: '这个文件是空的，请重新选择。' };
  if (file.size > 30 * 1024 * 1024) return { ok: false, reason: '网页体验支持 30 MB 以内的音频文件。' };
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name)) return { ok: false, reason: '请选择音频文件，例如 MP3 或 WAV。' };
  return { ok: true, reason: '' };
}
/** @param {number} index @param {number} count */
export function nextIndex(index, count) { return count > 0 ? (index + 1) % count : 0; }
