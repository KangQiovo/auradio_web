import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { albums } from '../src/lib/albums.mjs';
import { paletteFromPixels, relativeLuminance, paletteFromRgb } from '../src/lib/palette.mjs';
const solid = (r,g,b,n=256) => Uint8ClampedArray.from(Array.from({length:n},()=>[r,g,b,255]).flat());
test('the three requested recordings keep distinct verified identities',()=>{
  assert.deepEqual(albums.map(a=>a.title),['自由的你','于是','G.E.M.']);
  assert.match(albums[0].sourceUrl,/3436855494/);
  assert.match(albums[1].sourceUrl,/1053568849/);
  assert.match(albums[2].sourceUrl,/666994738/);
  assert.ok(albums.every(a=>!('audioUrl' in a)));
  assert.ok(albums.every(a=>['embed.music.apple.com','music.163.com'].includes(new URL(a.embedUrl).hostname)));
  assert.match(albums[0].previewNote,/平台/);
  assert.ok(albums.slice(1).every(a=>a.previewNote.includes('30 秒')));
});
test('cover extraction is deterministic, color-specific and contrast safe',()=>{
  const a=paletteFromPixels(solid(210,61,50)),b=paletteFromPixels(solid(94,123,220));
  assert.notDeepEqual(a,b);
  assert.deepEqual(a,paletteFromPixels(solid(210,61,50)));
  assert.ok(relativeLuminance(a.dark)<0.05);
  assert.ok(relativeLuminance(a.accent)>0.45);
  assert.ok(relativeLuminance(b.dark)<0.05);
});
test('transparent, invalid and grayscale covers have a usable palette',()=>{
  for(const data of [new Uint8ClampedArray(),new Uint8ClampedArray(256),solid(255,255,255),solid(0,0,0)]){
    const p=paletteFromPixels(data);
    assert.ok(/^#[\da-f]{6}$/i.test(p.dark));
    assert.ok(/^#[\da-f]{6}$/i.test(p.accent));
  }
  assert.ok(paletteFromRgb([NaN,Infinity,-2]).dark);
});
test('a small chromatic region is not washed out by white album borders',()=>{
  const data=new Uint8ClampedArray([...solid(250,250,250,200),...solid(170,140,209,60)]);
  const p=paletteFromPixels(data);
  assert.notEqual(p.accent,paletteFromPixels(solid(250,250,250)).accent);
});
test('public pages and serialized product data have no release identifiers or changelog',()=>{
  for(const f of readdirSync('src/pages').filter(x=>x.endsWith('.astro'))){
    const s=readFileSync('src/pages/'+f,'utf8');
    assert.doesNotMatch(s,/Demo\s*\d|\bfix\s*\d|\d+\.\d+\.\d+-demo|changelog|changes\.map|release\.(?:date|version|name)/i,f);
  }
  const data=readFileSync('src/lib/content.mjs','utf8');
  assert.doesNotMatch(data,/export const changes|\bversion\s*:|\baudited\s*:|\babi\s*:|Demo\s*\d/i);
});
