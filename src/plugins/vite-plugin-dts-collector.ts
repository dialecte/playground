import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:dts-libs'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

interface PackageEntry {
	/** npm package name, e.g. '@dialecte/core' */
	name: string
	/** subpath export, e.g. '.' or './v2019C1' */
	subpath?: string
	/** path to the dist folder containing .d.ts files */
	distDir: string
}

interface DtsCollectorOptions {
	packages: PackageEntry[]
}

function collectDtsFiles(dir: string, base: string = ''): Array<{ relativePath: string; content: string }> {
	const results: Array<{ relativePath: string; content: string }> = []
	if (!fs.existsSync(dir)) return results

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const rel = base ? `${base}/${entry.name}` : entry.name
		const full = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			results.push(...collectDtsFiles(full, rel))
		} else if (entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.ts.map')) {
			results.push({
				relativePath: rel,
				content: fs.readFileSync(full, 'utf-8'),
			})
		}
	}
	return results
}

export function dtsCollectorPlugin(options: DtsCollectorOptions): Plugin {
	return {
		name: 'vite-plugin-dts-collector',
		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL_MODULE_ID) return

			const libs: Record<string, string> = {}

			for (const pkg of options.packages) {
				const files = collectDtsFiles(pkg.distDir)
				for (const file of files) {
					const monacoPath = `file:///node_modules/${pkg.name}/dist/${file.relativePath}`
					libs[monacoPath] = file.content.replace(/\/\/# sourceMappingURL=.*$/gm, '')
				}

				// Monaco uses Node-style resolution and doesn't understand package.json "exports".
				// When TS sees import('@dialecte/core'), it looks for:
				//   file:///node_modules/@dialecte/core/index.d.ts
				// But our files are at:
				//   file:///node_modules/@dialecte/core/dist/index.d.ts
				// So we add a root-level shim that re-exports from dist.
				if (!pkg.subpath || pkg.subpath === '.') {
					const shimPath = `file:///node_modules/${pkg.name}/index.d.ts`
					libs[shimPath] = `export * from './dist/index';\n`
				}

				// For subpath exports (e.g. @dialecte/scl/v2019C1),
				// Monaco looks for file:///node_modules/@dialecte/scl/v2019C1/index.d.ts
				// or file:///node_modules/@dialecte/scl/v2019C1.d.ts
				if (pkg.subpath && pkg.subpath !== '.') {
					const subpathClean = pkg.subpath.replace(/^\.\//, '')
					// index.d.ts under the subpath folder
					const shimPath = `file:///node_modules/${pkg.name}/${subpathClean}/index.d.ts`
					libs[shimPath] = `export * from '../dist/${subpathClean}/index';\n`
					// Also a .d.ts file next to the folder
					const shimPath2 = `file:///node_modules/${pkg.name}/${subpathClean}.d.ts`
					libs[shimPath2] = `export * from './dist/${subpathClean}/index';\n`
				}
			}

			return `export default ${JSON.stringify(libs)};`
		},
	}
}
