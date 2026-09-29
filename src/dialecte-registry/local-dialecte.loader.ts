import { describeCoreMismatch } from './describe-core-mismatch'
import { detectDialecte } from './detect-dialecte'

import { localDialecteMeta, localDialecteModule } from 'virtual:local-dialecte'

import { publishEvent } from '@/console/event-sink'

import type { DialecteModuleNamespace, LoadedDialecte } from './dialecte-registry.types'
import type {
	LocalDialecteMeta,
	LocalDialecteTypeLibraries,
} from '@/plugins/local-dialecte/local-dialecte.types'

const TYPE_LIBRARIES_ENDPOINT = '/__local-dialecte/type-libraries'
const TYPES_CHANGED_EVENT = 'local-dialecte:types-changed'
const TYPE_REFRESH_DELAY_IN_MILLISECONDS = 150

type LocalDialecteListener = (dialecte: LoadedDialecte) => void

type LocalDialecteParts = {
	moduleNamespace: DialecteModuleNamespace
	meta: LocalDialecteMeta
}

// Kept across hot updates: a type-only edit refreshes the libraries of the module already loaded.
let currentParts: LocalDialecteParts | null =
	localDialecteModule !== null && localDialecteMeta !== null
		? { moduleNamespace: localDialecteModule, meta: localDialecteMeta }
		: null

async function fetchTypeLibraries(): Promise<LocalDialecteTypeLibraries> {
	const response = await fetch(TYPE_LIBRARIES_ENDPOINT)
	if (!response.ok) throw new Error(`The dev server refused ${TYPE_LIBRARIES_ENDPOINT}`)
	return (await response.json()) as LocalDialecteTypeLibraries
}

/** Short identifier from a package name: `@acme/widget` becomes `widget`. */
function deriveDialecteId(packageName: string): string {
	return packageName.split('/').at(-1) ?? packageName
}

async function buildLocalDialecte(parts: LocalDialecteParts): Promise<LoadedDialecte | null> {
	const { moduleNamespace, meta } = parts

	const detection = detectDialecte(moduleNamespace)
	if (!detection.isDetected) {
		publishEvent({
			source: 'lifecycle',
			level: 'error',
			title: `${meta.packageName} cannot be plugged`,
			detail: detection.reason,
		})
		return null
	}

	const typeLibraries = await fetchTypeLibraries()

	return {
		...detection.detectedExports,
		id: deriveDialecteId(meta.packageName),
		label: `${meta.packageName} ${meta.versionFolder}`,
		source: 'local',
		packageSpecifier: meta.packageSpecifier,
		moduleNamespace,
		typeLibraries: typeLibraries.libraries,
		typeLibraryPaths: typeLibraries.paths,
	}
}

function announce(params: {
	dialecte: LoadedDialecte
	meta: LocalDialecteMeta
	reason: string
}): void {
	const { dialecte, meta, reason } = params

	publishEvent({
		source: 'lifecycle',
		level: 'success',
		title: `Dialecte ${dialecte.label} ${reason}`,
		detail: `${Object.keys(dialecte.typeLibraries).length} source files, root <${dialecte.config.rootElementName}>`,
		data: {
			packageVersion: meta.packageVersion,
			createProject: dialecte.createProjectExportName,
			config: dialecte.configExportName,
			exports: Object.keys(dialecte.moduleNamespace),
		},
	})

	const mismatch = describeCoreMismatch({
		coreRange: meta.coreRange,
		installedCoreVersion: meta.installedCoreVersion,
	})
	if (mismatch !== null) {
		publishEvent({
			source: 'lifecycle',
			level: 'warning',
			title: `${meta.packageName} targets another engine release`,
			detail: mismatch,
		})
	}
}

/** The dialecte plugged into the dev server, or `null` when none is (always, once deployed). */
export async function loadLocalDialecte(): Promise<LoadedDialecte | null> {
	if (currentParts === null) return null

	const dialecte = await buildLocalDialecte(currentParts)
	if (dialecte !== null) announce({ dialecte, meta: currentParts.meta, reason: 'plugged' })
	return dialecte
}

/** Call back with a fresh dialecte whenever its sources change on disk. */
export function watchLocalDialecte(listener: LocalDialecteListener): void {
	if (!import.meta.hot || currentParts === null) return

	let pendingTypeRefresh: ReturnType<typeof setTimeout> | null = null

	async function reload(reason: string): Promise<void> {
		if (currentParts === null) return
		const dialecte = await buildLocalDialecte(currentParts)
		if (dialecte === null) return
		announce({ dialecte, meta: currentParts.meta, reason })
		listener(dialecte)
	}

	// The dev server finds this boundary by reading the source for this exact call, so it must stay
	// spelled out in full: through an alias the update would instead re-run the whole application.
	import.meta.hot.accept(
		'virtual:local-dialecte',
		function acceptReloadedModule(reloadedModule): void {
			const reloadedNamespace =
				reloadedModule?.localDialecteModule as DialecteModuleNamespace | null
			const reloadedMeta = reloadedModule?.localDialecteMeta as LocalDialecteMeta | null
			if (!reloadedNamespace || !reloadedMeta) return

			currentParts = { moduleNamespace: reloadedNamespace, meta: reloadedMeta }
			pendingTypeRefresh = clearPendingRefresh(pendingTypeRefresh)
			reload('reloaded')
		},
	)

	// A type-only edit triggers no module update, so the sources are re-read on this signal alone.
	// A code edit triggers both; whichever comes second finds the same module and only refreshes
	// what the editor knows.
	import.meta.hot.on(TYPES_CHANGED_EVENT, function scheduleTypeRefresh(): void {
		pendingTypeRefresh = clearPendingRefresh(pendingTypeRefresh)
		pendingTypeRefresh = setTimeout(function refreshTypes(): void {
			pendingTypeRefresh = null
			reload('types refreshed')
		}, TYPE_REFRESH_DELAY_IN_MILLISECONDS)
	})
}

function clearPendingRefresh(pendingRefresh: ReturnType<typeof setTimeout> | null): null {
	if (pendingRefresh !== null) clearTimeout(pendingRefresh)
	return null
}
