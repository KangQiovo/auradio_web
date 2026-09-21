import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {albums} from '../src/lib/albums.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the three selected records use the requested exact descriptions',()=>{
  assert.deepEqual(albums.map(a=>a.description),[
    '做你想做的，你是自由的！',
    '成长要学会独处，虽然有一点孤独。',
    'Get everybody moving.',
  ]);
});
test('album colour has local scopes and no global page tint selectors',()=>{
  const css=read('src/styles/albums.css');
  assert.doesNotMatch(css,/html\[data-album\]|\.page-ambience|:root\s*\{/);
  assert.match(css,/\.album-scope\s*\{/);
  assert.match(css,/\.album-ambience\s*\{[^}]*position:absolute/);
  assert.doesNotMatch(read('src/layouts/Site.astro'),/page-ambience|album-ambience/);
  for(const page of ['index','experience'])assert.match(read(`src/pages/${page}.astro`),/data-album-scope/);
});
test('display names use 体验 without the former room suffix',()=>{
  function scan(dir){for(const name of readdirSync(new URL('../'+dir,import.meta.url),{withFileTypes:true})){
    const path=dir+'/'+name.name;
    if(name.isDirectory())scan(path);
    else if(/\.(astro|tsx?|mjs)$/.test(path))assert.ok(!read(path).includes('体验'+'室'),path);
  }}
  scan('src');
});
test('ambient updates modify only the supplied scope and are idempotent',async()=>{
  const {applyAmbient}=await import('../src/lib/ambient.mjs');
  function scope(){const props={};const layers=[{style:{}},{style:{}}];return {
    dataset:{},style:{setProperty:(key,value)=>{props[key]=value;}},
    querySelectorAll:selector=>{assert.equal(selector,':scope > .album-ambience > div');return layers;},props,layers,
  };}
  const featured=scope(),experience=scope();
  const palette={accent:'#ccbbaa',dark:'#101820',soft:'#253540',paper:'#edf0ec',glow:'#557788'};
  applyAmbient(featured,palette,'freedom');
  assert.equal(featured.dataset.album,'freedom');
  assert.equal(featured.props['--album-accent'],palette.accent);
  assert.deepEqual(experience.dataset,{});assert.deepEqual(experience.props,{});
  const layer=featured.dataset.ambientLayer;
  applyAmbient(featured,palette,'freedom');
  assert.equal(featured.dataset.ambientLayer,layer);
  applyAmbient(null,palette,'freedom');
});
