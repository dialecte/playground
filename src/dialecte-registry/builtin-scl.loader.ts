import { detectDialecte } from './detect-dialecte'

import * as sclModuleNamespace from '@dialecte/scl/v2019C1'

import type { LoadedDialecte } from './dialecte-registry.types'

const SCL_PACKAGE_SPECIFIER = '@dialecte/scl/v2019C1'

/**
 * The dialecte that ships with the playground. Its declarations are part of the editor's base
 * type libraries, so it contributes none of its own.
 */
export function loadBuiltinSclDialecte(): LoadedDialecte {
	const detection = detectDialecte(sclModuleNamespace)
	if (!detection.isDetected) {
		throw new Error(`${SCL_PACKAGE_SPECIFIER} is not a loadable dialecte: ${detection.reason}`)
	}

	return {
		...detection.detectedExports,
		id: 'scl',
		label: 'SCL 2019C1',
		source: 'builtin',
		packageSpecifier: SCL_PACKAGE_SPECIFIER,
		moduleNamespace: sclModuleNamespace,
		typeLibraries: {},
		typeLibraryPaths: {},
	}
}
