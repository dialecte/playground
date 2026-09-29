import type { AnyDialecteConfig, Project, StorageParam } from '@dialecte/core'

export type DialecteSource = 'builtin' | 'local'

/** Everything a dialecte package exports, as loaded at runtime. */
export type DialecteModuleNamespace = Record<string, unknown>

export type CreateDialecteProject = (params?: {
	storage?: StorageParam
}) => Project<AnyDialecteConfig>

/** The two exports the playground needs, found by naming and shape convention. */
export type DetectedDialecteExports = {
	createProjectExportName: string
	createProject: CreateDialecteProject
	configExportName: string
	config: AnyDialecteConfig
}

export type DialecteDetectionResult =
	| { isDetected: true; detectedExports: DetectedDialecteExports }
	| { isDetected: false; reason: string }

/** Monaco virtual file path -> declaration or source content. */
export type TypeLibraries = Record<string, string>

/** Additions to Monaco's compiler `paths`, so the package specifier resolves to its libraries. */
export type TypeLibraryPaths = Record<string, string[]>

export type LoadedDialecte = DetectedDialecteExports & {
	/** Stable identifier; also names the browser database so dialectes never share one. */
	id: string
	label: string
	source: DialecteSource
	/** What a script imports the dialecte from; the ambient globals are typed against it. */
	packageSpecifier: string
	moduleNamespace: DialecteModuleNamespace
	typeLibraries: TypeLibraries
	typeLibraryPaths: TypeLibraryPaths
}

export type GlobalsDeclarationParams = {
	packageSpecifier: string
	createProjectExportName: string
}
