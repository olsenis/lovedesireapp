// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://lovedesireapp.com',
  integrations: [tailwind({ applyBaseStyles: true })],
  build: {
    inlineStylesheets: 'auto',
  },
});
