import { readDefaultScript } from './default-scripts'
import { transpileScript } from './diagnostics.service'
import { computeLineDiffStats } from './line-diff-stats'
import { prepareExecutableSource } from './prepare-executable-source'
import { commitPendingPreview, discardPendingPreview } from './preview.service'
import { runScript } from './run-script.service'

import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { describeProblem } from '@/console/describe-problem'
import { publishEvent } from '@/console/event-sink'
import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'
import { readRunContext } from '@/workspace/workspace.service'
import { useWorkspaceStore } from '@/workspace/workspace.store'

import type { PendingPreview, RunStatus, RunSummary, ScriptDiagnostic } from './runner.types'

const SCRIPT_STORAGE_KEY = 'dialecte-playground::scripts'
const PREVIEW_STORAGE_KEY = 'dialecte-playground::preview'

export const useRunnerStore = defineStore('runner', () => {
	const registryStore = useDialecteRegistryStore()
	const workspaceStore = useWorkspaceStore()

	/** One script per dialecte: switching dialecte must not overwrite the other one's script. */
	const scriptsByDialecte = useStorage<Record<string, string>>(SCRIPT_STORAGE_KEY, {})
	const status = ref<RunStatus>('idle')

	/** When on, a run stages its first transaction and waits for a decision instead of committing. */
	const isPreviewEnabled = useStorage(PREVIEW_STORAGE_KEY, false)
	const pendingPreview = shallowRef<PendingPreview | null>(null)

	const isRunning = computed(() => status.value !== 'idle')

	const script = computed({
		get(): string {
			const dialecteId = registryStore.activeDialecte.id
			return scriptsByDialecte.value[dialecteId] ?? readDefaultScript(dialecteId)
		},
		set(nextScript: string) {
			const dialecteId = registryStore.activeDialecte.id
			scriptsByDialecte.value = { ...scriptsByDialecte.value, [dialecteId]: nextScript }
		},
	})

	function resetScript(): void {
		const dialecteId = registryStore.activeDialecte.id
		const { [dialecteId]: _discarded, ...otherScripts } = scriptsByDialecte.value
		scriptsByDialecte.value = otherScripts
	}

	function publishDiagnostics(diagnostics: ScriptDiagnostic[]): void {
		for (const diagnostic of diagnostics) {
			publishEvent({
				source: 'problem',
				level: 'error',
				title: diagnostic.message,
				detail: diagnostic.lineNumber === null ? 'script' : `script line ${diagnostic.lineNumber}`,
			})
		}
		publishEvent({
			source: 'run',
			level: 'error',
			title: `Run blocked by ${diagnostics.length} type error(s)`,
		})
	}

	function publishSummary(summary: RunSummary): void {
		const { durationInMilliseconds, commitCount, diffStats } = summary
		publishEvent({
			source: 'run',
			level: 'success',
			title: `Run finished in ${durationInMilliseconds} ms`,
			detail: `${commitCount} commit(s), +${diffStats.addedLineCount} / -${diffStats.removedLineCount} XML lines`,
			data: {
				durationInMilliseconds,
				commitCount,
				addedLineCount: diffStats.addedLineCount,
				removedLineCount: diffStats.removedLineCount,
			},
		})
	}

	async function compileScript(): Promise<string | null> {
		const transpiled = await transpileScript()
		if (transpiled.diagnostics.length > 0) {
			publishDiagnostics(transpiled.diagnostics)
			return null
		}
		if (transpiled.emittedJavaScript === null) {
			publishEvent({ source: 'run', level: 'error', title: 'The compiler produced no output' })
			return null
		}

		const prepared = prepareExecutableSource(transpiled.emittedJavaScript)
		if (!prepared.isExecutable) {
			publishEvent({ source: 'problem', level: 'error', title: prepared.reason })
			return null
		}
		return prepared.source
	}

	async function executeCompiledScript(source: string): Promise<void> {
		const context = readRunContext()
		if (context === null) {
			publishEvent({
				source: 'run',
				level: 'warning',
				title: 'Nothing to run against',
				detail: 'open a file first',
			})
			return
		}

		const xmlBeforeRun = workspaceStore.currentXml
		const commitCountBeforeRun = workspaceStore.snapshot.documentState.history.length

		publishEvent({ source: 'run', level: 'info', title: 'Run started' })
		workspaceStore.beginChangeBatch()

		let durationInMilliseconds: number | null = null
		try {
			const outcome = await runScript({ source, context, isPreview: isPreviewEnabled.value })
			durationInMilliseconds = outcome.durationInMilliseconds
			pendingPreview.value = outcome.pendingPreview
		} catch (thrown) {
			publishEvent(describeProblem(thrown))
			publishEvent({ source: 'run', level: 'error', title: 'Run failed' })
		} finally {
			await workspaceStore.endChangeBatch()
		}

		if (durationInMilliseconds === null) return

		publishSummary({
			durationInMilliseconds,
			commitCount: workspaceStore.snapshot.documentState.history.length - commitCountBeforeRun,
			diffStats: computeLineDiffStats({
				previous: xmlBeforeRun,
				current: workspaceStore.currentXml,
			}),
		})
	}

	async function commitPreview(): Promise<void> {
		pendingPreview.value = null
		try {
			await commitPendingPreview()
		} catch (thrown) {
			publishEvent(describeProblem(thrown))
		}
	}

	function discardPreview(): void {
		pendingPreview.value = null
		discardPendingPreview()
	}

	async function run(): Promise<void> {
		if (isRunning.value) return

		// A transaction staged by an earlier run was built against records this run may change.
		discardPreview()

		status.value = 'checking'
		try {
			const source = await compileScript()
			if (source === null) return

			status.value = 'running'
			await executeCompiledScript(source)
		} catch (thrown) {
			publishEvent(describeProblem(thrown))
		} finally {
			status.value = 'idle'
		}
	}

	return {
		script,
		status,
		isRunning,
		isPreviewEnabled,
		pendingPreview,
		run,
		resetScript,
		commitPreview,
		discardPreview,
	}
})
