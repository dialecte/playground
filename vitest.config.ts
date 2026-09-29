import { fileURLToPath, URL } from 'node:url'

import { importerAwareAliasPlugin } from './src/plugins/importer-aware-alias/vite-plugin-importer-aware-alias'

import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [
		importerAwareAliasPlugin({
			defaultSourceRoot: fileURLToPath(new URL('./src', import.meta.url)),
			scopedSourceRoots: [],
		}),
	],
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
})
