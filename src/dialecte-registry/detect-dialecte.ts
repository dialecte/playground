import type {
	CreateDialecteProject,
	DialecteDetectionResult,
	DialecteModuleNamespace,
} from './dialecte-registry.types'
import type { AnyDialecteConfig } from '@dialecte/core'

const PROJECT_FACTORY_NAME = /^create\w+Project$/

function isProjectFactory(entry: [string, unknown]): entry is [string, CreateDialecteProject] {
	const [exportName, exportedValue] = entry
	return PROJECT_FACTORY_NAME.test(exportName) && typeof exportedValue === 'function'
}

function isDialecteConfig(entry: [string, unknown]): entry is [string, AnyDialecteConfig] {
	const exportedValue = entry[1]
	return (
		typeof exportedValue === 'object' &&
		exportedValue !== null &&
		'rootElementName' in exportedValue &&
		'definition' in exportedValue
	)
}

function listExportNames(entries: [string, unknown][]): string {
	return entries.map((entry) => entry[0]).join(', ')
}

/**
 * Recognize a dialecte package from what it exports: one `create<Name>Project` factory and one
 * config object. Both come out of the package scaffold, so a dialecte needs no playground-specific
 * wiring to be loaded.
 */
export function detectDialecte(moduleNamespace: DialecteModuleNamespace): DialecteDetectionResult {
	const exportEntries = Object.entries(moduleNamespace)
	const projectFactories = exportEntries.filter(isProjectFactory)
	const configs = exportEntries.filter(isDialecteConfig)

	if (projectFactories.length === 0) {
		return { isDetected: false, reason: 'no export named create<Name>Project was found' }
	}
	if (projectFactories.length > 1) {
		const names = listExportNames(projectFactories)
		return { isDetected: false, reason: `several project factories are exported: ${names}` }
	}
	if (configs.length === 0) {
		return {
			isDetected: false,
			reason: 'no exported dialecte config (an object with rootElementName and definition)',
		}
	}
	if (configs.length > 1) {
		const names = listExportNames(configs)
		return { isDetected: false, reason: `several dialecte configs are exported: ${names}` }
	}

	const [createProjectExportName, createProject] = projectFactories[0]!
	const [configExportName, config] = configs[0]!

	return {
		isDetected: true,
		detectedExports: { createProjectExportName, createProject, configExportName, config },
	}
}
