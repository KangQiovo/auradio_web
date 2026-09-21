import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('standalone preview server is present',()=>assert.ok(existsSync('server.mjs')));
test('range parsing and root containment behave safely',async()=>{
  const {parseRange,resolvePublicPath}=await import('../server.mjs');
  assert.deepEqual(parseRange('bytes=0-9',100),{start:0,end:9});
  assert.deepEqual(parseRange('bytes=-10',100),{start:90,end:99});
  assert.deepEqual(parseRange('bytes=20-',100),{start:20,end:99});
  assert.equal(parseRange('bytes=100-101',100),false);
  assert.equal(parseRange('bytes=3-1',100),false);
  assert.equal(parseRange('bytes=0-1,4-5',100),false);
  assert.equal(parseRange(undefined,100),null);
  for(const input of ['/auradio_web/../package.json','/auradio_web/%2e%2e/package.json','/auradio_web/a%5c..%5c..%5cpackage.json','/src/lib/content.mjs','/auradio_web/.git/config','/auradio_web/%00'])
    assert.equal(resolvePublicPath(input),null,input);
});
test('local HTTP serves only built files, supports media seeking and refuses writes',async()=>{
  const {createPreviewServer}=await import('../server.mjs');
  const root=mkdtempSync(join(tmpdir(),'auradio-test-'));
  mkdirSync(join(root,'audio'));writeFileSync(join(root,'index.html'),'<h1>听见</h1>');
  writeFileSync(join(root,'404.html'),'Not found');writeFileSync(join(root,'audio/daylight.wav'),Buffer.alloc(100));
  const server=createPreviewServer({root});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    const home=await fetch(base+'/auradio_web/');
    assert.equal(home.status,200);assert.match(await home.text(),/听见/);
    const wav=await fetch(base+'/auradio_web/audio/daylight.wav',{headers:{Range:'bytes=0-43'}});
    assert.equal(wav.status,206);assert.equal((await wav.arrayBuffer()).byteLength,44);
    assert.match(wav.headers.get('content-range'),/^bytes 0-43\//);
    const invalid=await fetch(base+'/auradio_web/audio/daylight.wav',{headers:{Range:'bytes=99999999-'}});
    assert.equal(invalid.status,416);
    const head=await fetch(base+'/auradio_web/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    assert.equal((await fetch(base+'/package.json')).status,404);
    assert.equal((await fetch(base+'/auradio_web/',{method:'POST'})).status,405);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true});}
});
