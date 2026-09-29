import { applyCompilerOptions, initMonaco } from './monaco-setup'

import * as monaco from 'monaco-editor'

import { buildGlobalsDeclaration } from '@/dialecte-registry/build-globals-declaration'

import type { LoadedDialecte } from '@/dialecte-registry/dialecte-registry.types'

const GLOBALS_DECLARATION_PATH = 'file:///playground-globals.ts'

let installedLibraries: monaco.IDisposable[] = []

/**
 * Make the editor type a script against ONE dialecte: its own declarations, the path mappings that
 * resolve its specifier, and the globals a script finds in scope. Whatever a previously active
 * dialecte installed is removed first, so a reloaded dialecte never leaves stale types behind.
 */
export function installDialecteTypeLibraries(dialecte: LoadedDialecte): void {
	initMonaco()

	for (const installedLibrary of installedLibraries) installedLibrary.dispose()

	const typescriptDefaults = monaco.typescript.typescriptDefaults
	applyCompilerOptions({ additionalPaths: dialecte.typeLibraryPaths })

	const dialecteLibraries = Object.entries(dialecte.typeLibraries).map(([libraryPath, content]) =>
		typescriptDefaults.addExtraLib(content, libraryPath),
	)

	const globalsDeclaration = buildGlobalsDeclaration({
		packageSpecifier: dialecte.packageSpecifier,
		createProjectExportName: dialecte.createProjectExportName,
	})
	const globalsLibrary = typescriptDefaults.addExtraLib(
		globalsDeclaration,
		GLOBALS_DECLARATION_PATH,
	)

	installedLibraries = [...dialecteLibraries, globalsLibrary]
}
