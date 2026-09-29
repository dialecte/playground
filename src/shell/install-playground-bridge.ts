import { installAgentBridge } from '@/console/agent-bridge'
import { useConsoleStore } from '@/console/console.store'
import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'
import { useRunnerStore } from '@/runner/runner.store'
import { useWorkspaceStore } from '@/workspace/workspace.store'

import type { JsonValue } from '@/console/event-log.types'

/** Wire the read-only agent surface to the stores. Called once, after the stores exist. */
export function installPlaygroundBridge(): void {
	const consoleStore = useConsoleStore()
	const registryStore = useDialecteRegistryStore()
	const runnerStore = useRunnerStore()
	const workspaceStore = useWorkspaceStore()

	function readState(): JsonValue {
		const { activeDialecte } = registryStore
		const { snapshot } = workspaceStore
		const { error, progress, history, loading, lastUpdate } = snapshot.documentState

		return {
			dialecte: {
				id: activeDialecte.id,
				label: activeDialecte.label,
				source: activeDialecte.source,
				rootElementName: activeDialecte.config.rootElementName,
			},
			availableDialecteIds: registryStore.availableDialectes.map((dialecte) => dialecte.id),
			project: snapshot.projectName,
			document: {
				id: snapshot.documentId,
				name: snapshot.documentName,
				canUndo: snapshot.canUndo,
				canRedo: snapshot.canRedo,
				loading,
				lastUpdate,
				commitCount: history.length,
				progress,
				error: error === null ? null : { code: error.code, key: error.key, detail: error.detail },
			},
			run: { status: runnerStore.status },
			xml: { current: workspaceStore.currentXml, previous: workspaceStore.previousXml },
		}
	}

	installAgentBridge({
		readEvents: () => consoleStore.log.events,
		readState,
		isIdle: () => !runnerStore.isRunning && !workspaceStore.isBusy,
	})
}
