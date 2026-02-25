<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import CodeEditor from './components/editor/CodeEditor.vue'
import XmlDiffViewer from './components/editor/XmlDiffViewer.vue'
import ConsolePanel from './components/editor/ConsolePanel.vue'
import MenuBar from './components/MenuBar.vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { useFileDialog } from '@vueuse/core'
import { usePlaygroundStore } from '@/stores/playground.store'

const store = usePlaygroundStore()

const { open: openFileDialog, onChange } = useFileDialog({
	accept: '.fsd, .asd, .xml, .scd, .ssd',
	multiple: false,
})

onChange(async (files) => {
	const file = Array.from(files || [])[0]
	if (file) await store.importFile(file)
})

function isInsideCodeEditor() {
	const active = document.activeElement
	if (!active) return false
	const codePanel = document.getElementById('code-panel')
	return codePanel?.contains(active) ?? false
}

function isInsideXmlPanel() {
	const active = document.activeElement
	if (!active) return false
	const xmlPanel = document.getElementById('xml-panel')
	return xmlPanel?.contains(active) ?? false
}

function handleKeydown(e: KeyboardEvent) {
	const mod = e.metaKey || e.ctrlKey

	// Ctrl/Cmd + Enter → run (always)
	if (mod && e.key === 'Enter') {
		e.preventDefault()
		store.run()
		return
	}

	// Ctrl/Cmd + O → open file dialog
	if (mod && e.key === 'o') {
		e.preventDefault()
		openFileDialog()
		return
	}

	// Ctrl/Cmd + S → save file
	if (mod && e.key === 's') {
		e.preventDefault()
		store.exportFile()
		return
	}

	// Cmd/Ctrl + Shift + Z → redo (skip if inside code editor — let Monaco handle it)
	if (mod && e.shiftKey && e.key === 'z') {
		if (isInsideCodeEditor()) return
		e.preventDefault()
		store.redo()
		return
	}

	// Cmd/Ctrl + Z → undo (skip if inside code editor — let Monaco handle it)
	if (mod && e.key === 'z') {
		if (isInsideCodeEditor()) return
		e.preventDefault()
		store.undo()
		return
	}
}

function handleXmlPanelKeydown(e: KeyboardEvent) {
	const mod = e.metaKey || e.ctrlKey
	if (!mod || e.key !== 'z') return

	e.preventDefault()
	e.stopPropagation()

	if (e.shiftKey) {
		store.redo()
	} else {
		store.undo()
	}
}

onMounted(() => {
	window.addEventListener('keydown', handleKeydown, { capture: true })
	const xmlPanel = document.getElementById('xml-panel')
	xmlPanel?.addEventListener('keydown', handleXmlPanelKeydown, true)
	store.init()
})
onUnmounted(() => {
	window.removeEventListener('keydown', handleKeydown, { capture: true })
	const xmlPanel = document.getElementById('xml-panel')
	xmlPanel?.removeEventListener('keydown', handleXmlPanelKeydown, true)
})
</script>

<template>
	<div class="flex flex-col h-screen">
	<header class="flex items-center justify-between px-3 h-11 bg-white border-b text-xs font-semibold gap-3">
		<img src="/logo-reversed.svg" class="size-7" />
		<span class="text-orange-500 whitespace-nowrap">Dialecte Playground</span>
		<MenuBar :open-file="openFileDialog" />
		<div class="flex items-center gap-2 ml-auto">
			<span v-if="store.error" class="text-red-700 max-w-[400px] truncate">
				{{ store.error }}
			</span>
			<button
				class="px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
				:disabled="store.isRunning"
				@click="store.run()"
			>
				<svg
					v-if="store.isRunning"
					class="animate-spin h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					/>
				</svg>
				<svg v-else class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
					<path d="M8 5v14l11-7z" />
				</svg>
				{{ store.isRunning ? 'Running...' : 'Run' }}
			</button>
			<button
				class="px-3 py-1.5 border border-gray-300 text-gray-500 rounded hover:bg-gray-50 transition-colors"
				@click="store.resetPlayground()"
			>
				Reset
			</button>
		</div>
	</header>

	<main class="w-full font-semibold text-sm flex-1 overflow-hidden">
		<SplitterGroup id="playground-outer" direction="vertical">
			<SplitterPanel id="editors-panel" :default-size="75" :min-size="30">
				<SplitterGroup id="playground-splitter" direction="horizontal">
					<SplitterPanel id="code-panel" :default-size="50" :min-size="25">
						<div class="h-full flex flex-col">
							<div
								class="px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide"
							>
								TypeScript — <span class="text-gray-400">Ctrl+CMD+Enter to run</span>
							</div>
							<div class="flex-1 overflow-hidden">
								<CodeEditor />
							</div>
						</div>
					</SplitterPanel>

					<SplitterResizeHandle
						id="playground-resize-handle"
						class="w-1.5 bg-gray-200 hover:bg-orange-400 transition-colors cursor-col-resize"
					/>

					<SplitterPanel id="xml-panel" :default-size="50" :min-size="25">
						<div class="h-full flex flex-col">
							<div
								class="px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide"
							>
								XML Output — <span class="text-gray-400">Diff view</span>
							</div>
							<div class="flex-1 overflow-hidden">
								<XmlDiffViewer />
							</div>
						</div>
					</SplitterPanel>
				</SplitterGroup>
			</SplitterPanel>

			<SplitterResizeHandle
				id="console-resize-handle"
				class="h-1.5 bg-gray-200 hover:bg-orange-400 transition-colors cursor-row-resize"
			/>

			<SplitterPanel id="console-panel" :default-size="25" :min-size="10">
				<div class="h-full flex flex-col">
					<div
						class="px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide flex items-center justify-between"
					>
						<div class="flex items-center gap-2">
							Console
							<span
								v-if="store.consoleEntries.length"
								class="bg-gray-200 text-gray-500 rounded-full px-1.5 py-0 text-[10px] font-medium"
							>
								{{ store.consoleEntries.length }}
							</span>
						</div>
						<button
							v-if="store.consoleEntries.length"
							class="text-gray-400 hover:text-gray-500 transition-colors text-[10px] uppercase tracking-wide"
							@click="store.consoleEntries = []"
						>
							Clear
						</button>
					</div>
					<div class="flex-1 overflow-hidden">
						<ConsolePanel />
					</div>
				</div>
			</SplitterPanel>
		</SplitterGroup>
	</main>
	</div>
</template>