import fs from 'node:fs'
import path from 'node:path'

import { readLocalDialecteManifest } from './local-dialecte-manifest'

import { searchForWorkspaceRoot } from 'vite'

import type {
	DialectePackageJson,
	LocalDialecteManifest,
	LocalDialecteMeta,
	LocalDialectePluginOptions,
	LocalDialecteTypeLibraries,
} from './local-dialecte.types'
import type { Plugin } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:local-dialecte'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`
const TYPE_LIBRARIES_ENDPOINT = '/__local-dialecte/type-libraries'
const TYPES_CHANGED_EVENT = 'local-dialecte:types-changed'

const NO_LOCAL_DIALECTE_MODULE = `export const localDialecteModule = null
export const localDialecteMeta = null
`

function readManifest(packageRoot: string): LocalDialecteManifest {
	const packageJsonPath = path.join(packageRoot, 'package.json')
	if (!fs.existsSync(packageJsonPath)) {
		throw new Error(`DIALECTE_LOCAL points at ${packageRoot}, which has no package.json`)
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as DialectePackageJson
	const result = readLocalDialecteManifest({ packageJson, packageRoot })
	if (!result.isReadable) {
		throw new Error(`The dialecte at ${packageRoot} cannot be plugged: ${result.reason}`)
	}
	if (!fs.existsSync(result.manifest.sourceEntry)) {
		throw new Error(`The dialecte at ${packageRoot} has no ${result.manifest.sourceEntry}`)
	}
	return result.manifest
}

function isLibrarySource(fileName: string): boolean {
	return fileName.endsWith('.ts') && !fileName.endsWith('.test.ts')
}

function collectSourceFiles(directory: string): string[] {
	const sourceFiles: string[] = []
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			// A dialecte's test helpers import the test runner, which the editor knows nothing about.
			if (entry.name !== 'test') sourceFiles.push(...collectSourceFiles(entryPath))
		} else if (isLibrarySource(entry.name)) {
			sourceFiles.push(entryPath)
		}
	}
	return sourceFiles
}

/** The dialecte's own sources, laid out in the editor's virtual file system as an installed package. */
function buildTypeLibraries(manifest: LocalDialecteManifest): LocalDialecteTypeLibraries {
	const virtualSourceRoot = `file:///node_modules/${manifest.packageName}/src`
	const libraries: Record<string, string> = {}

	for (const sourceFile of collectSourceFiles(manifest.sourceRoot)) {
		const relativePath = path.relative(manifest.sourceRoot, sourceFile).split(path.sep).join('/')
		libraries[`${virtualSourceRoot}/${relativePath}`] = fs.readFileSync(sourceFile, 'utf-8')
	}

	return {
		libraries,
		paths: {
			[manifest.packageSpecifier]: [`${virtualSourceRoot}/${manifest.versionFolder}/index.ts`],
			'@/*': [`${virtualSourceRoot}/*`],
		},
	}
}

function buildVirtualModule(params: {
	manifest: LocalDialecteManifest
	meta: LocalDialecteMeta
}): string {
	const { manifest, meta } = params
	return `import * as moduleNamespace from '/@fs${manifest.sourceEntry}'
export const localDialecteModule = moduleNamespace
export const localDialecteMeta = ${JSON.stringify(meta)}
`
}

/**
 * Plug a dialecte developed on this machine into the dev server, from its SOURCE: no build, no
 * watcher to run next to it, and an edit reaches the page as a hot update.
 *
 * The browser only ever imports `virtual:local-dialecte`. Without a plugged dialecte - always the
 * case in a production build - that module exports `null`, so nothing of this reaches the bundle.
 */
export function localDialectePlugin(options: LocalDialectePluginOptions): Plugin {
	let manifest: LocalDialecteManifest | null = null

	return {
		name: 'vite-plugin-local-dialecte',

		config(userConfig, environment) {
			if (environment.command !== 'serve' || options.packageRoot === undefined) return

			manifest = readManifest(options.packageRoot)
			// Naming an allowed folder REPLACES the default list, so the playground's own root is named too.
			const playgroundRoot = searchForWorkspaceRoot(userConfig.root ?? process.cwd())
			return {
				server: { fs: { allow: [playgroundRoot, manifest.packageRoot] } },
				// One engine instance for the playground and the dialecte. Two would not share a project
				// channel, and a record made by one would fail the identity checks of the other.
				resolve: { dedupe: ['@dialecte/core', 'dexie'] },
				optimizeDeps: {
					include: ['@dialecte/core', '@dialecte/core/helpers', '@dialecte/core/utils', 'dexie'],
				},
			}
		},

		resolveId(source) {
			if (source === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID
			return null
		},

		load(id) {
			if (id !== RESOLVED_VIRTUAL_MODULE_ID) return null
			if (manifest === null) return NO_LOCAL_DIALECTE_MODULE

			const {
				packageRoot: _packageRoot,
				sourceRoot: _sourceRoot,
				sourceEntry: _entry,
				...shared
			} = manifest
			return buildVirtualModule({
				manifest,
				meta: { ...shared, installedCoreVersion: options.installedCoreVersion },
			})
		},

		configureServer(server) {
			const pluggedManifest = manifest
			if (pluggedManifest === null) return

			server.middlewares.use(
				TYPE_LIBRARIES_ENDPOINT,
				function serveTypeLibraries(_request, response) {
					response.setHeader('Content-Type', 'application/json')
					response.end(JSON.stringify(buildTypeLibraries(pluggedManifest)))
				},
			)

			// A type-only file never enters the module graph, so its edits produce no hot update:
			// the sources are watched as a whole and the editor told to fetch its libraries again.
			const watchedSourceRoot = pluggedManifest.sourceRoot
			server.watcher.add(watchedSourceRoot)
			function announceWhenSourceChanged(changedFile: string): void {
				if (!changedFile.startsWith(`${watchedSourceRoot}${path.sep}`)) return
				if (!isLibrarySource(changedFile)) return
				server.ws.send({ type: 'custom', event: TYPES_CHANGED_EVENT })
			}
			server.watcher.on('change', announceWhenSourceChanged)
			server.watcher.on('add', announceWhenSourceChanged)
			server.watcher.on('unlink', announceWhenSourceChanged)
		},
	}
}
