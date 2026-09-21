import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeBandRanges, projectSpectrum, shouldAnimateField, relax} from '../src/lib/spectrum.mjs';
import {albums} from '../src/lib/albums.mjs';

test('G.E.M. editorial description is intentionally empty',()=>{
  assert.equal(albums.find(a=>a.id==='gem').description,'');
});
test('64 log-spaced frequency bands stay inside analyser limits',()=>{
  const ranges=makeBandRanges(48000,2048,64);
  assert.equal(ranges.length,64);
  assert.ok(ranges.every(([a,b])=>a>=1&&b>a&&b<=1024));
  assert.ok(ranges.every(([a],i)=>!i||a>=ranges[i-1][0]));
});
test('bass and treble peaks drive distinct frequency regions rather than a global average',()=>{
  const ranges=makeBandRanges(48000,2048,64),bins=new Uint8Array(1024),out=new Float32Array(64);
  bins[4]=255;projectSpectrum(bins,ranges,out);
  const low=Array.from(out);assert.ok(Math.max(...low.slice(0,25))>0.6);assert.equal(Math.max(...low.slice(40)),0);
  bins.fill(0);bins[300]=255;projectSpectrum(bins,ranges,out);
  assert.ok(Math.max(...out.slice(40))>0.2);assert.equal(Math.max(...out.slice(0,20)),0);
});
test('silence produces zero bands with no synthetic beat',()=>{
 const out=new Float32Array(64).fill(1);
 projectSpectrum(new Uint8Array(1024),makeBandRanges(48000,2048,64),out);
 assert.ok(out.every(n=>n===0));
});
test('pointer interaction can wake a paused visual without starting playback',()=>{
 const idle={visible:true,reduced:false,playing:false,idleMotion:false,interaction:0,settling:false};
 assert.equal(shouldAnimateField(idle),false);
 assert.equal(shouldAnimateField({...idle,interaction:0.6}),true);
 assert.equal(shouldAnimateField({...idle,settling:true}),true);
 assert.equal(shouldAnimateField({...idle,playing:true}),true);
 assert.equal(shouldAnimateField({...idle,visible:false,playing:true,interaction:1}),false);
 assert.equal(shouldAnimateField({...idle,reduced:true,playing:true,interaction:1}),false);
});
test('return-to-rest is frame-rate independent and does not overshoot',()=>{
 let n=1;for(let i=0;i<60;i++)n=relax(n,0,1/60,0.2);
 assert.ok(Math.abs(n-relax(1,0,1,0.2))<0.00001);
 assert.ok(relax(1,0,0.8,0.2)>=0);
});
test('field supports touch, wake-up events and per-band input',()=>{
 const s=readFileSync(new URL('../src/lib/field.ts',import.meta.url),'utf8');
 assert.doesNotMatch(s,/if\s*\(event\.pointerType\s*===\s*['"]touch['"]\)\s*return/);
 assert.match(s,/pointerdown/);assert.match(s,/pointercancel/);assert.match(s,/uSpectrum/);
});
