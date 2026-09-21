import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
// Portable previews retain their existing prefix; main's production job explicitly uses '/'.
const base = process.env.AURADIO_BASE || '/auradio_web';
if (!['/', '/auradio_web'].includes(base)) throw new Error('Unsupported website base');
export default defineConfig({
  site: 'https://auradio.kangqiovo.com',
  base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [react()],
  vite: { build: { sourcemap: false } },
});
