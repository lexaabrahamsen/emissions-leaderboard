import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // site: 'https://your-domain.dev', // set before launch: used for canonical URLs and OG images
  integrations: [react()],
});
