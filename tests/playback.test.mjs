import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, formatTime, safeSeek, validateAudioFile, nextIndex } from '../src/lib/playback.mjs';

test('clamp rejects non-finite values and bounds user controls', () => {
  assert.equal(clamp(NaN, 0, 1), 0);
  assert.equal(clamp(Infinity, 0, 1), 0);
  assert.equal(clamp(-3, 0, 1), 0);
  assert.equal(clamp(2, 0, 1), 1);
  assert.equal(clamp(.4, 0, 1), .4);
});
test('time is real seconds, padded and safe before media is ready', () => {
  assert.equal(formatTime(61.8), '01:01');
  assert.equal(formatTime(NaN), '00:00');
  assert.equal(formatTime(-4), '00:00');
});
test('seek cannot pass either end, even with invalid media metadata', () => {
  assert.equal(safeSeek(80, 30), 30);
  assert.equal(safeSeek(-1, 30), 0);
  assert.equal(safeSeek(2, NaN), 0);
});
test('local audio selection rejects empty, oversized and non-audio files', () => {
  assert.equal(validateAudioFile({size: 0, type: 'audio/wav', name:'a.wav'}).ok, false);
  assert.equal(validateAudioFile({size: 31*1024*1024, type:'audio/wav', name:'a.wav'}).ok, false);
  assert.equal(validateAudioFile({size: 1024, type:'text/html', name:'a.html'}).ok, false);
  assert.equal(validateAudioFile({size: 1024, type:'', name:'a.FLAC'}).ok, true);
});
test('mode navigation wraps and handles empty collections', () => {
  assert.equal(nextIndex(2, 3), 0);
  assert.equal(nextIndex(0, 0), 0);
});
