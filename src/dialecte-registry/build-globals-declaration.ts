import type { GlobalsDeclarationParams } from './dialecte-registry.types'

/**
 * Declaration of what a script finds in scope, typed against the ACTIVE dialecte. It is a regular
 * source file rather than a declaration file, because it contains a call; it is only ever
 * type-checked, never run.
 *
 * Written as real imports plus `declare global`: the editor's type checker follows the full
 * generic chain that way (allowed children, attribute names), which an inline
 * `typeof import('…')` does not reliably do there.
 */
export function buildGlobalsDeclaration(params: GlobalsDeclarationParams): string {
	const { packageSpecifier, createProjectExportName } = params

	return `import { ${createProjectExportName} as _createProject } from "${packageSpecifier}"
import * as _dialecte from "${packageSpecifier}"
import * as _helpers from "@dialecte/core/helpers"
import * as _utils from "@dialecte/core/utils"

// The project is typed from a CALL of the factory: its type parameters then take their defaults.
// Reading the factory's return type instead would widen them to their constraints, and every
// method a dialecte adds to a query or a transaction would disappear from the editor.
const _project = _createProject()
type _Document = ReturnType<(typeof _project)['openDocument']>

declare global {
	/** The project the playground opened; it owns the loaded file. */
	const project: typeof _project
	/** The loaded file: \`doc.query\`, \`doc.transaction(...)\`, \`doc.prepare(...)\`. */
	const doc: _Document
	/** Identifier of the loaded file inside the project. */
	const documentId: string
	/** Everything the active dialecte package exports. */
	const dialecte: typeof _dialecte
	/** Type guards and converters from @dialecte/core/helpers. */
	const helpers: typeof _helpers
	/** invariant, formatXml, … from @dialecte/core/utils. */
	const utils: typeof _utils

	// The editor's type checker runs without the browser declarations, so the console a script
	// logs to is declared here. Its output is mirrored in the playground console.
	interface Console {
		log(...loggedArguments: any[]): void
		info(...loggedArguments: any[]): void
		debug(...loggedArguments: any[]): void
		warn(...loggedArguments: any[]): void
		error(...loggedArguments: any[]): void
	}
	const console: Console
}

export {}
`
}
