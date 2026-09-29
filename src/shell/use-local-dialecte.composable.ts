import { until } from '@vueuse/core'

import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'
import { loadLocalDialecte, watchLocalDialecte } from '@/dialecte-registry/local-dialecte.loader'
import { useRunnerStore } from '@/runner/runner.store'

import type { LoadedDialecte } from '@/dialecte-registry/dialecte-registry.types'

/**
 * Plug the dialecte the dev server was started with, make it the active one, and swap in every
 * reloaded version of it. Does nothing when no dialecte is plugged, which is always the case once
 * deployed. The returned promise settles once the attempt is over, so the first project opened is
 * the right one.
 */
export function useLocalDialecte(): Promise<void> {
	const registryStore = useDialecteRegistryStore()
	const runnerStore = useRunnerStore()

	/** A script keeps running against the project it started with: the swap waits for it. */
	async function registerWhenIdle(dialecte: LoadedDialecte): Promise<void> {
		await until(() => runnerStore.isRunning).toBe(false)
		registryStore.registerDialecte(dialecte)
	}

	async function plugLocalDialecte(): Promise<void> {
		const dialecte = await loadLocalDialecte()
		if (dialecte === null) return

		registryStore.registerDialecte(dialecte)
		registryStore.activateDialecte(dialecte.id)
		watchLocalDialecte(registerWhenIdle)
	}

	return plugLocalDialecte()
}
