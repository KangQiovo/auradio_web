import test from 'node:test';
import assert from 'node:assert/strict';
import {paletteFromPixels} from '../src/lib/palette.mjs';
const solid=(r,g,b,n)=>Uint8ClampedArray.from(Array.from({length:n},()=>[r,g,b,255]).flat());
test('cream paper borders do not overpower chromatic cover art',()=>{
  const paper=solid(244,234,219,250),orange=solid(221,89,42,40);
  const result=paletteFromPixels(new Uint8ClampedArray([...paper,...orange]));
  assert.deepEqual(result,paletteFromPixels(orange));
});
