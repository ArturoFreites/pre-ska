// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://ska.ar',
	integrations: [
		sitemap({
			filter: (page) => !page.includes('/dino-check') && !page.includes('/chupetona'),
		}),
	],
});
