import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { release, platforms } from '../src/lib/content.mjs';
const walk = d => readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
test('public data contains no application commit identity or detailed roadmap', () => {
  assert.equal(release.source, undefined);
  assert.deepEqual(platforms.map(p=>p.name), ['Android','更多可能']);
});
test('public website text and maintenance docs contain no private source fingerprints', () => {
  const files = [...walk('src'),...walk('docs'),'README.md'];
  for (const file of files) {
    const text=readFileSync(file,'utf8');
    assert.doesNotMatch(text, /\b[a-f0-9]{40}\b/i, file);
    assert.doesNotMatch(text, /KangQiovo\/auradio(?:[\/\s'"?]|$)/,file);
    assert.doesNotMatch(text, /apps\/(?:android_app|flutter_app)|docs\/progress-updates|VersionCode|一次性回执|独立进程与数据目录/,file);
  }
});
