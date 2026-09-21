import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import config from '../astro.config.mjs';

test('Pages custom domain serves the website at its root', () => {
  assert.equal(config.site, 'https://auradio.kangqiovo.com');
  assert.equal(config.base, '/');
});

test('crawler endpoints do not point at the obsolete repository prefix', () => {
  for (const path of ['src/pages/robots.txt.ts','src/pages/sitemap.xml.ts']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.ok(!source.includes('kangqiovo.github.io/auradio_web'), path);
  }
});
