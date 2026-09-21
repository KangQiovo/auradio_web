import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, formatTime, validateAudio, getTrackTitle } from '../src/lib/audio.mjs';
import { product, platforms, providers, motionSources } from '../src/lib/content.mjs';

test('clamp handles invalid values and bounds', () => {
  assert.equal(clamp(NaN, 0, 1), 0);
  assert.equal(clamp(Infinity, 0, 1), 0);
  assert.equal(clamp(-3, 0, 1), 0);
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(0.3, 0, 1), 0.3);
});
test('media time never displays NaN or negative duration', () => {
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(formatTime(-1), '0:00');
  assert.equal(formatTime(125.8), '2:05');
});
test('local audio validates type, empty files and the 100 MiB memory limit', () => {
  assert.equal(validateAudio({name:'track.MP3', type:'', size:2048}), '');
  assert.equal(validateAudio({name:'track.flac', type:'audio/flac', size:2048}), '');
  assert.match(validateAudio({name:'script.html',type:'text/html',size:2048}), /音频/);
  assert.match(validateAudio({name:'empty.wav',type:'audio/wav',size:0}), /空/);
  assert.match(validateAudio({name:'big.wav',type:'audio/wav',size:105000000}), /100/);
});
test('local titles are display text, not HTML or filesystem paths', () => {
  assert.equal(getTrackTitle('song.mp3'), 'song');
  assert.equal(getTrackTitle('音乐\u0000.wav'), '音乐');
  assert.equal(getTrackTitle(''), '本地音频');
});
test('product copy exposes only a stage and public capabilities', () => {
  assert.equal(product.prerelease, true);
  assert.equal(product.publicDownload, null);
  assert.equal(product.version, undefined);
  assert.equal(product.date, undefined);
  assert.equal(product.languages, 16);
});
test('unreleased platforms and web-only providers cannot appear connected', () => {
  assert.ok(platforms.filter(p => p.name !== 'Android').every(p => p.available === false));
  assert.equal(providers.length, 7);
  assert.ok(providers.every(p => p.nativeLibrary === false));
});
test('three distinct motion libraries have verified star provenance and license labels', () => {
  assert.deepEqual(motionSources.map(s => s.name), ['Motion', 'GSAP', 'Three.js']);
  assert.ok(motionSources.every(s => s.starred === true && s.repository));
  assert.notEqual(motionSources.find(s => s.name === 'GSAP').license, 'MIT');
});
