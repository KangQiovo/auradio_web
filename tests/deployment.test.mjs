import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('production origin matches the configured custom domain', () => {
  assert.match(readFileSync('astro.config.mjs', 'utf8'), /https:\/\/auradio\.kangqiovo\.com/);
});
test('production can use root without breaking the portable preview prefix', () => {
  assert.match(readFileSync('astro.config.mjs', 'utf8'), /process\.env\.AURADIO_BASE/);
});
test('main deployment explicitly builds root and checks the production artifact', () => {
  const workflow = readFileSync('.github/workflows/static.yml', 'utf8');
  assert.match(workflow, /AURADIO_BASE: '\/'/);
  assert.match(workflow, /node scripts\/verify-root-build.mjs/);
  assert.match(workflow, /branches: \[main\]/);
});
