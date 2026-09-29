import { computeProgressFraction } from './compute-progress-fraction'
import {
	downloadFile,
	exportXml,
	importFile,
	openWorkspace,
	readWorkspaceSnapshot,
	redo,
	resetWorkspace,
	subscribeToDocumentChanges,
	subscribeToWorkspace,
	undo,
} from './workspace.service'

import { useDebounceFn } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'

import { publishEvent } from '@/console/event-sink'
import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'

import type { WorkspaceSnapshot } from './workspace.types'
import type { LoadedDialecte } from '@/dialecte-registry/dialecte-registry.types'

const XML_REFRESH_DELAY_IN_MILLISECONDS = 50

export const useWorkspaceStore = defineStore('workspace', () => {
	const registryStore = useDialecteRegistryStore()

	const snapshot = shallowRef<WorkspaceSnapshot>(readWorkspaceSnapshot())
	const currentXml = ref('')
	const previousXml = ref('')
	const lastFailure = ref<string | null>(null)

	const hasDocument = computed(() => snapshot.value.documentId !== null)
	const isBusy = computed(() => snapshot.value.documentState.loading)
	const progressFraction = computed(() => {
		const progress = snapshot.value.documentState.progress
		return progress === null ? null : computeProgressFraction(progress)
	})
	const acceptedFileExtensions = computed(() =>
		registryStore.activeDialecte.config.io.supportedFileExtensions.join(', '),
	)

	function reportFailure(failure: unknown): void {
		const message = failure instanceof Error ? failure.message : String(failure)
		lastFailure.value = message
		publishEvent({ source: 'problem', level: 'error', title: message })
	}

	async function refreshXml(): Promise<void> {
		try {
			const exported = await exportXml()
			const nextXml = exported?.xml ?? ''
			// A late notification about a change already shown must not move the comparison base.
			if (nextXml === currentXml.value) return

			previousXml.value = currentXml.value
			currentXml.value = nextXml
		} catch (failure) {
			reportFailure(failure)
		}
	}

	/** Show the current records on both sides: a freshly loaded file has no change to show. */
	async function resetXmlBaseline(): Promise<void> {
		await refreshXml()
		previousXml.value = currentXml.value
	}

	// A script may commit several transactions. While it runs the view is left alone, so that the
	// diff shown afterwards compares the file before the run with the file after it.
	let isBatchingChanges = false

	function beginChangeBatch(): void {
		isBatchingChanges = true
	}

	async function endChangeBatch(): Promise<void> {
		isBatchingChanges = false
		await refreshXml()
	}

	// The guard sits inside the delayed function: a refresh queued just before a run must not fire
	// in the middle of it.
	const refreshXmlUnlessBatching = useDebounceFn(
		async function refreshUnlessBatching(): Promise<void> {
			if (isBatchingChanges) return
			await refreshXml()
		},
		XML_REFRESH_DELAY_IN_MILLISECONDS,
	)

	async function runGuarded(action: () => Promise<void>): Promise<void> {
		lastFailure.value = null
		try {
			await action()
		} catch (failure) {
			reportFailure(failure)
		}
	}

	// Opening is not re-entrant: a dialecte activated while another one is still opening waits its
	// turn, and then opens whichever dialecte is active by then.
	let pendingOpen: Promise<void> = Promise.resolve()
	let openedProjectFactory: LoadedDialecte['createProject'] | null = null

	function openActiveDialecte(): Promise<void> {
		pendingOpen = pendingOpen.then(function openWhenReady(): Promise<void> {
			// Asked twice for the same code (at startup, then when a dialecte gets plugged): open once.
			const projectFactory = registryStore.activeDialecte.createProject
			if (projectFactory === openedProjectFactory) return Promise.resolve()
			openedProjectFactory = projectFactory

			return runGuarded(async function openAndShow(): Promise<void> {
				await openWorkspace({ dialecte: registryStore.activeDialecte })
				await resetXmlBaseline()
			})
		})
		return pendingOpen
	}

	async function openFile(file: File): Promise<void> {
		await runGuarded(async function importAndShow(): Promise<void> {
			await importFile({ file })
			await resetXmlBaseline()
		})
	}

	async function saveFile(): Promise<void> {
		await runGuarded(downloadFile)
	}

	async function undoLastChange(): Promise<void> {
		await runGuarded(undo)
	}

	async function redoLastChange(): Promise<void> {
		await runGuarded(redo)
	}

	async function resetEverything(): Promise<void> {
		await runGuarded(async function destroyAndShow(): Promise<void> {
			await resetWorkspace()
			await resetXmlBaseline()
		})
	}

	subscribeToWorkspace(function showSnapshot(nextSnapshot: WorkspaceSnapshot): void {
		snapshot.value = nextSnapshot
	})
	subscribeToDocumentChanges(refreshXmlUnlessBatching)

	// Reopen the project when the CODE of the active dialecte changed - another dialecte, or a hot
	// reload of the same one. A refresh of its types alone keeps the same factory and the open project.
	watch(() => registryStore.activeDialecte.createProject, openActiveDialecte)

	return {
		snapshot,
		currentXml,
		previousXml,
		lastFailure,
		hasDocument,
		isBusy,
		progressFraction,
		acceptedFileExtensions,
		beginChangeBatch,
		endChangeBatch,
		openActiveDialecte,
		openFile,
		saveFile,
		undoLastChange,
		redoLastChange,
		resetEverything,
	}
})
