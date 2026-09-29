import { loader } from '@guolao/vue-monaco-editor'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import prettierPluginEstree from 'prettier/plugins/estree'
import prettierPluginTypescript from 'prettier/plugins/typescript'
import * as prettier from 'prettier/standalone'
import baseTypeLibraries from 'virtual:dts-libs'

import type { TypeLibraryPaths } from '@/dialecte-registry/dialecte-registry.types'

/** Where the script lives in the editor's virtual file system. */
export const SCRIPT_MODEL_PATH = 'file:///playground.ts'

/**
 * The editor resolves modules the classic way and ignores a package's `exports` map, so every
 * specifier a script may reference is pointed at its declaration file explicitly.
 */
export const BASE_TYPE_LIBRARY_PATHS: TypeLibraryPaths = {
	'@dialecte/core': ['file:///node_modules/@dialecte/core/index.d.ts'],
	'@dialecte/core/helpers': ['file:///node_modules/@dialecte/core/helpers.d.ts'],
	'@dialecte/core/utils': ['file:///node_modules/@dialecte/core/utils.d.ts'],
	'@dialecte/scl/v2019C1': ['file:///node_modules/@dialecte/scl/v2019C1.d.ts'],
}

// The engine's declarations mention these two packages; a script never touches them, so a loose
// stub is enough to keep the type checker quiet.
const DEXIE_STUB = `
export class Dexie {
	constructor(name: string)
	[key: string]: any
}
export class EntityTable<T = any, TKey = any> {
	[key: string]: any
}
export default Dexie
`

const SAX_STUB = `
export class SAXParser { [key: string]: any }
export function parser(strict?: boolean, options?: any): SAXParser
`

let isInitialized = false

/** Compiler options of a script, with the path mappings of the active dialecte merged in. */
export function applyCompilerOptions(params: { additionalPaths: TypeLibraryPaths }): void {
	monaco.typescript.typescriptDefaults.setCompilerOptions({
		target: monaco.typescript.ScriptTarget.ESNext,
		module: monaco.typescript.ModuleKind.ESNext,
		moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
		// Every script is a module: that is what makes top-level `await` legal.
		moduleDetection: 3,
		allowNonTsExtensions: true,
		strict: true,
		esModuleInterop: true,
		allowJs: true,
		// The script is compiled to JavaScript before it runs, so the emit must stay on.
		noEmit: false,
		lib: ['esnext', 'dom'],
		baseUrl: 'file:///',
		paths: { ...BASE_TYPE_LIBRARY_PATHS, ...params.additionalPaths },
	})
}

async function formatScript(model: monaco.editor.ITextModel): Promise<monaco.languages.TextEdit[]> {
	try {
		const formatted = await prettier.format(model.getValue(), {
			parser: 'typescript',
			plugins: [prettierPluginTypescript, prettierPluginEstree],
			useTabs: true,
			singleQuote: true,
			semi: false,
			trailingComma: 'all',
			printWidth: 100,
		})
		return [{ range: model.getFullModelRange(), text: formatted }]
	} catch {
		return []
	}
}

export function initMonaco(): void {
	if (isInitialized) return
	isInitialized = true

	self.MonacoEnvironment = {
		getWorker(_workerId: string, label: string): Worker {
			if (label === 'typescript' || label === 'javascript') return new tsWorker()
			return new editorWorker()
		},
	}

	loader.config({ monaco })

	const typescriptDefaults = monaco.typescript.typescriptDefaults

	applyCompilerOptions({ additionalPaths: {} })
	typescriptDefaults.setDiagnosticsOptions({
		noSemanticValidation: false,
		noSyntaxValidation: false,
	})

	for (const [libraryPath, content] of Object.entries(baseTypeLibraries)) {
		typescriptDefaults.addExtraLib(content, libraryPath)
	}
	typescriptDefaults.addExtraLib(DEXIE_STUB, 'file:///node_modules/dexie/index.d.ts')
	typescriptDefaults.addExtraLib(SAX_STUB, 'file:///node_modules/sax/index.d.ts')

	monaco.languages.registerDocumentFormattingEditProvider('typescript', {
		provideDocumentFormattingEdits: formatScript,
	})
}
