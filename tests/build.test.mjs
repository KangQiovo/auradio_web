import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const built = existsSync('dist/index.html');
function walk(root) { return readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(root, e.name)) : [join(root, e.name)]); }

test('built site links and assets resolve under the GitHub Pages base', { skip: !built }, () => {
  for (const page of walk('dist').filter(path => path.endsWith('.html'))) {
    const html = readFileSync(page, 'utf8');
    for (const [, href] of html.matchAll(/(?:href|src|component-url|renderer-url)="([^"]+)"/g)) {
      if (!href.startsWith('/')) continue;
      assert(href.startsWith('/auradio_web/'), `${page}: invalid base ${href}`);
      const path = href.split('#')[0].split('?')[0].replace('/auradio_web/', '');
      const target = `dist/${path}${path.endsWith('/') || !path ? 'index.html' : ''}`;
      assert(existsSync(target), `${page}: missing ${target}`);
    }
  }
});
test('build has no source maps or server bundle in the public output', { skip: !built }, () => {
  for (const path of walk('dist')) assert(!/\.map$|\/server\//.test(path), path);
});
