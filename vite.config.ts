import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { importerAwareAliasPlugin } from './src/plugins/importer-aware-alias/vite-plugin-importer-aware-alias'
import { localDialectePlugin } from './src/plugins/local-dialecte/vite-plugin-local-dialecte'
import { dtsCollectorPlugin } from './src/plugins/vite-plugin-dts-collector'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

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

const installedCoreVersion: string = JSON.parse(
	fs.readFileSync(path.join(coreDir, 'package.json'), 'utf-8'),
).version

const playgroundRoot = fileURLToPath(new URL('.', import.meta.url))
const playgroundSourceRoot = path.join(playgroundRoot, 'src')

/**
 * A dialecte developed on this machine, plugged into the dev server:
 * `DIALECTE_LOCAL=../my-dialecte npm run dev`, or the same line in `.env.local`.
 */
function resolveLocalDialecteRoot(mode: string): string | undefined {
	const configuredPath =
		process.env.DIALECTE_LOCAL ?? loadEnv(mode, playgroundRoot, 'DIALECTE_').DIALECTE_LOCAL
	if (configuredPath === undefined || configuredPath === '') return undefined
	return path.resolve(playgroundRoot, configuredPath)
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const localDialecteRoot = resolveLocalDialecteRoot(mode)

	return {
		base: process.env.GITHUB_ACTIONS ? '/playground/' : '/',
		plugins: [
			importerAwareAliasPlugin({
				defaultSourceRoot: playgroundSourceRoot,
				scopedSourceRoots:
					localDialecteRoot === undefined
						? []
						: [{ packageRoot: localDialecteRoot, sourceRoot: path.join(localDialecteRoot, 'src') }],
			}),
			localDialectePlugin({ packageRoot: localDialecteRoot, installedCoreVersion }),
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
						name: '@dialecte/core',
						subpath: './helpers',
						distDir: coreDist,
					},
					{
						name: '@dialecte/core',
						subpath: './utils',
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
	}
})
