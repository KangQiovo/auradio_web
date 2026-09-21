import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  site: 'https://kangqiovo.github.io',
  base: '/auradio_web',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react()],
  vite: { build: { sourcemap: false } },
});
