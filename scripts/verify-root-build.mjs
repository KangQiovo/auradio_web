import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve('dist');
const origin = 'https://auradio.kangqiovo.com';
function walk(dir) { return readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(resolve(dir,e.name)) : [resolve(dir,e.name)]); }
let checked = 0;
for (const file of walk(root)) {
  assert.ok(!file.endsWith('.map'), 'Production source map must not be published');
  if (!file.endsWith('.html')) continue;
  const text = readFileSync(file, 'utf8');
  assert.doesNotMatch(text, /(?:href|src|component-url|renderer-url)=["']\/auradio_web\//, 'Production still uses the repository prefix');
  assert.ok(text.includes(origin), 'Missing custom-domain canonical metadata');
  const pagePath = '/' + relative(root,file).replaceAll('\\','/').replace(/index\.html$/, '');
  for (const match of text.matchAll(/(?:href|src|component-url|renderer-url)=["']([^"']+)["']/g)) {
    const value = match[1];
    if (!value || value.startsWith('#') || /^(https?:|mailto:|tel:|data:|blob:)/.test(value)) continue;
    const url = new URL(value, origin + pagePath);
    const target = resolve(root, '.' + decodeURIComponent(url.pathname));
    assert.ok(target === root || target.startsWith(root + '/'), 'Path escaped the output root');
    assert.ok(existsSync(target), `Missing asset or internal page: ${value}`);
    assert.ok(!statSync(target).isDirectory() || existsSync(resolve(target,'index.html')), `Missing page index: ${value}`);
    checked++;
  }
}
for (const name of ['robots.txt','sitemap.xml']) {
  const content = readFileSync(resolve(root,name),'utf8');
  assert.ok(content.includes(origin));
  assert.ok(!content.includes('/auradio_web/'), 'Search metadata retains the old prefix');
}
console.log(`PASS production root: ${checked} page/asset references, canonical metadata, sitemap and source-map exclusion`);
