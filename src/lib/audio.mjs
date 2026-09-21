/** @param {number} value @param {number} min @param {number} max */
export function clamp(value, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}
/** @param {number} seconds */
export function formatTime(seconds) {
  const n = Math.floor(clamp(seconds, 0, 86400));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}
/** @param {{name:string,type:string,size:number}} file */
export function validateAudio(file) {
  if (!file.size) return '这是一个空文件，请选择有内容的音频。';
  if (file.size > 100 * 1024 * 1024) return '网页体验室支持 100 MiB 以内的单个音频文件。';
  if (!/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(file.name) || (file.type && !file.type.startsWith('audio/') && file.type !== 'application/octet-stream')) {
    return '请选择 MP3、M4A、AAC、WAV、FLAC、OGG 或 OPUS 音频文件。';
  }
  return '';
}
/** @param {string} name */
export function getTrackTitle(name) {
  return name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\.[^.]+$/, '').slice(0, 100).trim() || '本地音频';
}
