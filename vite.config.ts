import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { dtsCollectorPlugin } from './src/plugins/vite-plugin-dts-collector'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
		tailwindcss(),
		dtsCollectorPlugin({
			packages: [
				{
					name: '@dialecte/core',
					distDir: path.resolve(__dirname, '../core/dist'),
				},
				{
					name: '@dialecte/scl',
					subpath: './v2019C1',
					distDir: path.resolve(__dirname, '../scl/dist'),
				},
			],
		}),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
})
