/** The fields of a dialecte's package.json the playground reads. */
export type DialectePackageJson = {
	name?: string
	version?: string
	exports?: Record<string, unknown>
	dependencies?: Record<string, string>
}

/** Where a local dialecte lives and how a script refers to it. */
export type LocalDialecteManifest = {
	packageName: string
	packageVersion: string
	/** Version folder the package exposes, e.g. `v1`. */
	versionFolder: string
	/** What a script would import it from, e.g. `@acme/widget/v1`. */
	packageSpecifier: string
	packageRoot: string
	sourceRoot: string
	/** Source file standing behind the package's public entry. */
	sourceEntry: string
	/** Range of the engine the dialecte asks for, when it declares one. */
	coreRange: string | null
}

export type LocalDialecteManifestResult =
	| { isReadable: true; manifest: LocalDialecteManifest }
	| { isReadable: false; reason: string }

/** Sent to the browser alongside the module itself. */
export type LocalDialecteMeta = Omit<
	LocalDialecteManifest,
	'packageRoot' | 'sourceRoot' | 'sourceEntry'
> & {
	installedCoreVersion: string
}

export type LocalDialecteTypeLibraries = {
	/** Editor virtual path -> source content. */
	libraries: Record<string, string>
	/** Editor compiler `paths` additions resolving the package and its own `@/` alias. */
	paths: Record<string, string[]>
}

export type LocalDialectePluginOptions = {
	/** Absolute path of the dialecte package, or `undefined` when none is plugged. */
	packageRoot: string | undefined
	installedCoreVersion: string
}
