import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  site: 'https://kangqiovo.github.io',
  base: '/auradio_web',
  trailingSlash: 'always',
  output: 'static',
  integrations: [react()],
  vite: { build: { sourcemap: false } },
});
