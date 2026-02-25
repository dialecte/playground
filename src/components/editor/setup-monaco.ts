import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { loader } from '@guolao/vue-monaco-editor'
import dtsLibs from 'virtual:dts-libs'
import * as prettier from 'prettier/standalone'
import prettierPluginTypescript from 'prettier/plugins/typescript'
import prettierPluginEstree from 'prettier/plugins/estree'

let initialized = false

export function initMonaco() {
	if (initialized) return
	initialized = true

	// Workers
	self.MonacoEnvironment = {
		getWorker: (_: string, label: string) => {
			if (label === 'typescript' || label === 'javascript') {
				return new tsWorker()
			}
			return new editorWorker()
		},
	}

	loader.config({ monaco })

	// TypeScript compiler options
	const tsDefaults = monaco.languages.typescript.typescriptDefaults

	tsDefaults.setCompilerOptions({
		target: monaco.languages.typescript.ScriptTarget.ESNext,
		module: monaco.languages.typescript.ModuleKind.ESNext,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		moduleDetection: 3, // Force — treat all files as modules (allows top-level await)
		allowNonTsExtensions: true,
		strict: true,
		esModuleInterop: true,
		allowJs: true,
		noEmit: true,
		lib: ['esnext', 'dom'],
		baseUrl: 'file:///',
		paths: {
			'@dialecte/core': ['file:///node_modules/@dialecte/core/index.d.ts'],
			'@dialecte/scl/v2019C1': ['file:///node_modules/@dialecte/scl/v2019C1.d.ts'],
		},
	})

	tsDefaults.setDiagnosticsOptions({
		noSemanticValidation: false,
		noSyntaxValidation: false,
	})

	// Load all .d.ts files from packages
	for (const [filePath, content] of Object.entries(dtsLibs)) {
		tsDefaults.addExtraLib(content, filePath)
	}

	// Dexie type stub (used by @dialecte/core)
	const dexieStub = `
export class Dexie {
	constructor(name: string)
	version(v: number): any
	table(name: string): any
	open(): Promise<void>
	close(): void
	delete(): Promise<void>
	[key: string]: any
}
export class EntityTable<T = any, TKey = any> {
	get(key: TKey): Promise<T | undefined>
	add(item: T): Promise<TKey>
	put(item: T): Promise<TKey>
	delete(key: TKey): Promise<void>
	toArray(): Promise<T[]>
	where(index: string): any
	[key: string]: any
}
export default Dexie
`
	tsDefaults.addExtraLib(dexieStub, 'file:///node_modules/dexie/index.d.ts')

	// Sax type stub (used by @dialecte/core)
	tsDefaults.addExtraLib(
		`export class SAXParser { [key: string]: any }
export function parser(strict?: boolean, options?: any): SAXParser
`,
		'file:///node_modules/sax/index.d.ts',
	)

	// Ambient declarations for injected globals available in the playground.
	// Uses `import` + `declare global` so Monaco resolves the full generic chain
	// types (including ChildrenOf constraints on addChild). A plain `declare function`
	// with `ReturnType<typeof import(...)>` often fails in Monaco's TS worker.
	const playgroundGlobals = `
import { createSclDialecte as _createSclDialecte, importSclFiles as _importSclFiles, exportSclFile as _exportSclFile } from "@dialecte/scl/v2019C1"

declare global {
	const createSclDialecte: typeof _createSclDialecte
	const importSclFiles: typeof _importSclFiles
	const exportSclFile: typeof _exportSclFile
	const DATABASE_NAME: string

	interface Console {
		log(...args: any[]): void
		warn(...args: any[]): void
		error(...args: any[]): void
		info(...args: any[]): void
		debug(...args: any[]): void
		clear(): void
	}
	const console: Console
}

export {}
`
	tsDefaults.addExtraLib(playgroundGlobals, 'file:///playground-globals.d.ts')

	// Prettier formatting provider for TypeScript (Shift+Alt+F)
	monaco.languages.registerDocumentFormattingEditProvider('typescript', {
		async provideDocumentFormattingEdits(model) {
			const text = model.getValue()
			try {
				const formatted = await prettier.format(text, {
					parser: 'typescript',
					plugins: [prettierPluginTypescript, prettierPluginEstree],
					useTabs: true,
					singleQuote: true,
					semi: false,
					trailingComma: 'all',
					printWidth: 100,
				})
				return [
					{
						range: model.getFullModelRange(),
						text: formatted,
					},
				]
			} catch {
				return []
			}
		},
	})
}
