import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { dtsCollectorPlugin } from './src/plugins/vite-plugin-dts-collector'

import fs from 'node:fs'

const require = createRequire(import.meta.url)

/** Walk up from a resolved file until we find the package root (has package.json) */
function findPackageRoot(resolvedPath: string): string {
	let dir = path.dirname(resolvedPath)
	while (dir !== path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, 'package.json'))) return dir
		dir = path.dirname(dir)
	}
	throw new Error(`Could not find package root for ${resolvedPath}`)
}

const sclDir = findPackageRoot(require.resolve('@dialecte/scl/v2019C1'))
const sclDist = path.join(sclDir, 'dist')
const sclRequire = createRequire(path.join(sclDir, 'node_modules'))
const coreDir = findPackageRoot(sclRequire.resolve('@dialecte/core'))
const coreDist = path.join(coreDir, 'dist')

// https://vite.dev/config/
export default defineConfig({
	base: process.env.GITHUB_ACTIONS ? '/playground/' : '/',
	plugins: [
		vue(),
		vueDevTools(),
		tailwindcss(),
		dtsCollectorPlugin({
			packages: [
				{
					name: '@dialecte/core',
					distDir: coreDist,
				},
				{
					name: '@dialecte/scl',
					subpath: './v2019C1',
					distDir: sclDist,
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
