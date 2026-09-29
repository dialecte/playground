import { resolveAliasedPath } from './resolve-aliased-path'

import type { ImporterAwareAliasOptions } from './importer-aware-alias.types'
import type { Plugin } from 'vite'

/**
 * Replaces a plain `resolve.alias['@']`. A plain alias rewrites `@/` before any plugin sees the
 * importer, so a second package served by the same dev server would have its own `@/` imports
 * pointed at the playground sources.
 */
export function importerAwareAliasPlugin(options: ImporterAwareAliasOptions): Plugin {
	return {
		name: 'vite-plugin-importer-aware-alias',
		enforce: 'pre',
		async resolveId(source, importer, resolveOptions) {
			const aliasedPath = resolveAliasedPath({ source, importer, ...options })
			if (aliasedPath === null) return null

			const resolved = await this.resolve(aliasedPath, importer, {
				...resolveOptions,
				skipSelf: true,
			})
			return resolved
		},
	}
}
