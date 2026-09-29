import { loadBuiltinSclDialecte } from './builtin-scl.loader'

import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import type { LoadedDialecte } from './dialecte-registry.types'

export const useDialecteRegistryStore = defineStore('dialecte-registry', () => {
	const builtinDialecte = loadBuiltinSclDialecte()

	const availableDialectes = shallowRef<LoadedDialecte[]>([builtinDialecte])
	const activeDialecteId = useStorage('dialecte-playground::active-dialecte', builtinDialecte.id)

	const activeDialecte = computed(
		() =>
			availableDialectes.value.find((dialecte) => dialecte.id === activeDialecteId.value) ??
			builtinDialecte,
	)

	/** Add a dialecte, or swap in the freshly reloaded version of one already listed. */
	function registerDialecte(dialecte: LoadedDialecte): void {
		const otherDialectes = availableDialectes.value.filter(
			(availableDialecte) => availableDialecte.id !== dialecte.id,
		)
		availableDialectes.value = [...otherDialectes, dialecte]
	}

	function activateDialecte(dialecteId: string): void {
		activeDialecteId.value = dialecteId
	}

	return { availableDialectes, activeDialecte, registerDialecte, activateDialecte }
})
