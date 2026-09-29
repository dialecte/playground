import type { ResolveAliasedPathParams, ScopedSourceRoot } from './importer-aware-alias.types'

const ALIAS_PREFIX = '@/'

function stripQueryString(importer: string): string {
	const queryStart = importer.indexOf('?')
	return queryStart === -1 ? importer : importer.slice(0, queryStart)
}

function isInsidePackage(importerPath: string, scopedSourceRoot: ScopedSourceRoot): boolean {
	return importerPath.startsWith(`${scopedSourceRoot.packageRoot}/`)
}

/**
 * Map an `@/…` import to an absolute path, choosing the source root from WHERE the import is
 * written. Two packages loaded in the same dev server can then each keep their own `@` alias.
 * Returns `null` for a source that does not use the alias.
 */
export function resolveAliasedPath(params: ResolveAliasedPathParams): string | null {
	const { source, importer, defaultSourceRoot, scopedSourceRoots } = params

	if (!source.startsWith(ALIAS_PREFIX)) return null

	const relativePath = source.slice(ALIAS_PREFIX.length)
	const importerPath = importer === undefined ? undefined : stripQueryString(importer)

	const owningRoot =
		importerPath === undefined
			? undefined
			: scopedSourceRoots.find((scopedSourceRoot) =>
					isInsidePackage(importerPath, scopedSourceRoot),
				)

	const sourceRoot = owningRoot?.sourceRoot ?? defaultSourceRoot
	return `${sourceRoot}/${relativePath}`
}
