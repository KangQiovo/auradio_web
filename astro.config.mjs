import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  site: 'https://auradio.kangqiovo.com',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  integrations: [react()],
  vite: { build: { sourcemap: false } },
});
