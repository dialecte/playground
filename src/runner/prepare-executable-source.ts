import type { PreparedSource } from './runner.types'

const EMPTY_EXPORT = /^\s*export\s*\{\s*\}\s*;?\s*$/gm
const STATIC_IMPORT = /^\s*import\s+(?:[\w*{][^'"]*\bfrom\s*)?['"]/m
const EXPORT_STATEMENT = /^\s*export\s+/m
const SOURCE_URL_COMMENT = '//# sourceURL=playground-script.js'

/**
 * A script runs as the body of an async function, where module syntax is illegal. The compiler
 * treats every script as a module (that is what allows top-level `await`), so it appends an empty
 * export to a script without imports: that one is dropped. Anything else is refused with a reason.
 */
export function prepareExecutableSource(emittedJavaScript: string): PreparedSource {
	if (STATIC_IMPORT.test(emittedJavaScript)) {
		return {
			isExecutable: false,
			reason:
				'A script cannot import modules. The active dialecte is available as `dialecte`, ' +
				'the core helpers as `helpers` and `utils`.',
		}
	}

	const withoutEmptyExport = emittedJavaScript.replace(EMPTY_EXPORT, '')

	if (EXPORT_STATEMENT.test(withoutEmptyExport)) {
		return { isExecutable: false, reason: 'A script cannot export anything: remove the `export`.' }
	}

	return { isExecutable: true, source: `${withoutEmptyExport}\n${SOURCE_URL_COMMENT}` }
}
