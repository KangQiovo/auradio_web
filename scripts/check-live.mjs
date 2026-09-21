import assert from 'node:assert/strict';
const origin = 'https://auradio.kangqiovo.com';
const expected = process.env.EXPECTED_SHA;
if (!expected) throw new Error('EXPECTED_SHA required');
async function load(path) {
  const url = new URL(path, origin); url.searchParams.set('build', expected);
  const response = await fetch(url, {signal:AbortSignal.timeout(15000), cache:'no-store'});
  assert.equal(response.status,200,`HTTP ${response.status}: ${url.pathname}`);
  return response;
}
let last;
for(let attempt=0;attempt<8;attempt++) {
  try {
    const build=await (await load('/site-build.json')).json();
    assert.equal(build.commit, expected, 'CDN still serves a previous deployment');
    const resources=new Set();
    for(const path of ['/', '/experience/', '/progress/', '/privacy/', '/credits/']) {
      const html=await (await load(path)).text();
      assert.ok(html.includes('Auradio') || html.includes('auradio'), 'Wrong page');
      assert.doesNotMatch(html, /(?:href|src|component-url|renderer-url)=["']\/auradio_web\//);
      for(const m of html.matchAll(/(?:href|src|component-url|renderer-url)=["'](\/[^"']+)["']/g)) {
        if(m[1].startsWith('/_astro/') || m[1].startsWith('/brand/')) resources.add(m[1]);
      }
    }
    for(const path of resources) {
      const res=await load(path);
      if(path.endsWith('.css')) assert.match(res.headers.get('content-type')||'', /text\/css/);
      if(path.endsWith('.js')) assert.match(res.headers.get('content-type')||'', /javascript/);
      await res.arrayBuffer();
    }
    console.log(`LIVE_VERIFIED ${origin}/ commit=${expected}; 5 pages; ${resources.size} CSS/JS/brand resources`);
    process.exit(0);
  } catch(error) {last=error; console.error(`Live check ${attempt+1}/8: ${error.message}`); if(attempt<7) await new Promise(r=>setTimeout(r,10000));}
}
throw last;
