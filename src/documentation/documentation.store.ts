import { findDocumentationPage } from './documentation-pages'
import { renderMarkdown } from './render-markdown'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useDocumentationStore = defineStore('documentation', () => {
	const openPageId = ref<string | null>(null)

	const openPage = computed(() =>
		openPageId.value === null ? undefined : findDocumentationPage(openPageId.value),
	)
	const openPageHtml = computed(() =>
		openPage.value === undefined ? '' : renderMarkdown(openPage.value.markdown),
	)
	const isOpen = computed({
		get: () => openPage.value !== undefined,
		set(shouldBeOpen: boolean) {
			if (!shouldBeOpen) openPageId.value = null
		},
	})

	function showPage(pageId: string): void {
		openPageId.value = pageId
	}

	function closePage(): void {
		openPageId.value = null
	}

	return { openPage, openPageHtml, isOpen, showPage, closePage }
})
