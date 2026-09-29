<script setup lang="ts">
import { useDocumentationStore } from '../documentation.store'

import {
	DialogClose,
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
	DialogTitle,
} from 'reka-ui'

const COPIED_LABEL_DURATION_IN_MILLISECONDS = 1500

const documentationStore = useDocumentationStore()

/** One handler for every code block of the page: the buttons are part of the rendered HTML. */
async function copyCodeOfClickedBlock(clickEvent: MouseEvent): Promise<void> {
	const clicked = clickEvent.target
	if (!(clicked instanceof HTMLButtonElement) || !('copyCode' in clicked.dataset)) return

	const code = clicked.parentElement?.querySelector('code')?.textContent
	if (code === undefined || code === null) return

	await navigator.clipboard.writeText(code)
	clicked.textContent = 'Copied'
	setTimeout(() => {
		clicked.textContent = 'Copy'
	}, COPIED_LABEL_DURATION_IN_MILLISECONDS)
}
</script>

<template>
	<DialogRoot v-model:open="documentationStore.isOpen">
		<DialogPortal>
			<DialogOverlay class="fixed inset-0 z-40 bg-black/40" />
			<DialogContent
				class="fixed z-50 top-[5vh] left-1/2 -translate-x-1/2 w-[min(56rem,94vw)] max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl outline-none"
				aria-describedby="documentation-body"
				data-testid="documentation-dialog"
			>
				<header class="flex items-center gap-3 px-5 py-3 border-b shrink-0">
					<DialogTitle class="text-sm font-semibold text-orange-500">
						{{ documentationStore.openPage?.title }}
					</DialogTitle>
					<DialogClose
						class="ml-auto px-2.5 py-1 text-xs border border-gray-300 text-gray-500 rounded hover:bg-gray-50 transition-colors"
						data-testid="documentation-close"
					>
						Close
					</DialogClose>
				</header>

				<!-- The pages are shipped with the playground: their HTML is trusted. -->
				<article
					id="documentation-body"
					class="documentation-page overflow-y-auto px-6 py-4 text-sm text-gray-800"
					data-testid="documentation-body"
					@click="copyCodeOfClickedBlock"
					v-html="documentationStore.openPageHtml"
				/>
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>

<style scoped>
.documentation-page :deep(h1) {
	display: none; /* the dialog's own title already says it */
}
.documentation-page :deep(h2) {
	margin: 1.6rem 0 0.5rem;
	padding-bottom: 0.25rem;
	border-bottom: 1px solid #e5e7eb;
	font-size: 1.05rem;
	font-weight: 600;
	color: #ea580c;
}
.documentation-page :deep(p),
.documentation-page :deep(ul),
.documentation-page :deep(table),
.documentation-page :deep(blockquote) {
	margin: 0.6rem 0;
	line-height: 1.55;
}
.documentation-page :deep(ul) {
	padding-left: 1.25rem;
	list-style: disc;
}
.documentation-page :deep(li) {
	margin: 0.2rem 0;
}
.documentation-page :deep(a) {
	color: #ea580c;
	text-decoration: underline;
}
.documentation-page :deep(code) {
	padding: 0.05rem 0.3rem;
	border-radius: 0.25rem;
	background: #f3f4f6;
	font-size: 0.85em;
}
.documentation-page :deep(.code-block) {
	position: relative;
	margin: 0.7rem 0;
}
.documentation-page :deep(.code-block pre) {
	overflow-x: auto;
	padding: 0.75rem 1rem;
	border-radius: 0.375rem;
	background: #1f2937;
	color: #f9fafb;
	font-size: 0.8rem;
	line-height: 1.5;
}
.documentation-page :deep(.code-block code) {
	padding: 0;
	background: none;
	color: inherit;
	font-size: inherit;
}
.documentation-page :deep(.code-block button) {
	position: absolute;
	top: 0.4rem;
	right: 0.5rem;
	padding: 0.1rem 0.5rem;
	border-radius: 0.25rem;
	background: rgb(255 255 255 / 0.12);
	color: #d1d5db;
	font-size: 0.7rem;
	cursor: pointer;
}
.documentation-page :deep(.code-block button:hover) {
	background: rgb(255 255 255 / 0.24);
}
.documentation-page :deep(table) {
	display: block;
	overflow-x: auto;
	border-collapse: collapse;
}
.documentation-page :deep(th),
.documentation-page :deep(td) {
	padding: 0.35rem 0.6rem;
	border: 1px solid #e5e7eb;
	vertical-align: top;
	text-align: left;
}
.documentation-page :deep(th) {
	background: #f9fafb;
	font-weight: 600;
}
.documentation-page :deep(blockquote) {
	padding: 0.5rem 0.9rem;
	border-left: 3px solid #fb923c;
	background: #fff7ed;
}
</style>
