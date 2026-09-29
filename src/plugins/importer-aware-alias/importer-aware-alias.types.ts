/** A package whose own sources must win the alias when the importer lives inside it. */
export type ScopedSourceRoot = {
	/** Absolute path of the package folder; importers under it use `sourceRoot`. */
	packageRoot: string
	/** Absolute path the alias maps to for those importers. */
	sourceRoot: string
}

export type ImporterAwareAliasOptions = {
	/** Absolute path the alias maps to when no scoped root claims the importer. */
	defaultSourceRoot: string
	scopedSourceRoots: ScopedSourceRoot[]
}

export type ResolveAliasedPathParams = ImporterAwareAliasOptions & {
	source: string
	importer: string | undefined
}
