import { installDialecteTypeLibraries } from './type-libraries.service'

import { watch } from 'vue'

import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'

/** Keep the script editor typed against whichever dialecte is active, including after a reload. */
export function useDialecteTypes(): void {
	const registryStore = useDialecteRegistryStore()

	watch(() => registryStore.activeDialecte, installDialecteTypeLibraries, { immediate: true })
}
