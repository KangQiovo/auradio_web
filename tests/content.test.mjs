import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const content = JSON.parse(readFileSync('src/data/public-content.json', 'utf8'));
function files(root) { return readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)]); }

test('public copy distinguishes preview from public availability', () => {
  assert.match(content.release.name, /开发预览/);
  assert.match(content.release.availability, /尚未/);
  assert.equal(content.release.changes.length, 3);
  assert(content.faq.some(item => item.answer.includes('不公布详细路线')));
});
test('public source contains no private links, credentials or personal filesystem paths', () => {
  const forbidden = [ /github(?:usercontent)?\.com\/(?:repos\/)?KangQiovo\/auradio\//i, /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/, /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, /[?&]token=/i, /[A-Z]:\\Users\\/, /\/Users\/[^/]+\//, /-----BEGIN [A-Z ]*PRIVATE KEY-----/ ];
  for (const path of [...files('src'), ...files('public')]) {
    const text = readFileSync(path, 'utf8');
    for (const pattern of forbidden) assert(!pattern.test(text), `Public-content violation: ${path}`);
  }
});
test('public assets are limited to the brand SVG and third-party notices', () => {
  const allowed = new Set(['public/auradio-mark.svg', 'public/third-party-notices.txt']);
  for (const path of files('public')) assert(allowed.has(path), `Review new public asset: ${path}`);
});
test('all planned routes exist, including an actual 404 page', () => {
  for (const name of ['index', 'experience', 'updates', 'about', 'privacy', '404']) assert(readFileSync(`src/pages/${name}.astro`, 'utf8').includes('<Site'));
});
test('site does not ship music platform or private release download links', () => {
  const markup = files('src').map(path => readFileSync(path, 'utf8')).join('\n');
  assert(!/href\s*=\s*["'][^"']*\.(apk|aab|hap)(?:["'?])/i.test(markup));
  assert(!/navigator\.(?:sendBeacon|geolocation)|getUserMedia\s*\(/.test(markup));
});
