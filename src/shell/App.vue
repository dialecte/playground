<script setup lang="ts">
import MenuBar from './components/MenuBar.vue'
import { useLocalDialecte } from './use-local-dialecte.composable'
import { useShortcuts } from './use-shortcuts.composable'

import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { computed, onMounted } from 'vue'

import BottomPanel from '@/console/components/BottomPanel.vue'
import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'
import DocumentationDialog from '@/documentation/components/DocumentationDialog.vue'
import CodeEditor from '@/editor/components/CodeEditor.vue'
import XmlDiffViewer from '@/editor/components/XmlDiffViewer.vue'
import { useDialecteTypes } from '@/editor/use-dialecte-types.composable'
import PreviewActions from '@/runner/components/PreviewActions.vue'
import { useRunnerStore } from '@/runner/runner.store'
import { useWorkspaceStore } from '@/workspace/workspace.store'

const PANEL_HEADER_CLASSES =
	'px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide'

const registryStore = useDialecteRegistryStore()
const runnerStore = useRunnerStore()
const workspaceStore = useWorkspaceStore()

useShortcuts()
useDialecteTypes()
const localDialectePlugged = useLocalDialecte()

const progressPercentage = computed(() =>
	workspaceStore.progressFraction === null
		? null
		: Math.round(workspaceStore.progressFraction * 100),
)

async function resetPlayground(): Promise<void> {
	runnerStore.resetScript()
	await workspaceStore.resetEverything()
}

onMounted(async function openFirstProject(): Promise<void> {
	await localDialectePlugged
	await workspaceStore.openActiveDialecte()
})
</script>

<template>
	<div class="flex flex-col h-screen">
		<header
			class="flex items-center justify-between px-3 h-11 bg-white border-b text-xs font-semibold gap-3"
		>
			<img src="/logo-reversed.svg" class="size-7" alt="" />
			<span class="text-orange-500 whitespace-nowrap">Dialecte Playground</span>
			<MenuBar />

			<div class="flex items-center gap-2 ml-auto min-w-0">
				<span
					class="px-2 py-0.5 rounded bg-orange-50 text-orange-600 whitespace-nowrap"
					data-testid="active-dialecte"
				>
					{{ registryStore.activeDialecte.label }}
					<span class="text-orange-400 font-normal">{{ registryStore.activeDialecte.source }}</span>
				</span>
				<span class="text-gray-500 truncate font-normal" data-testid="active-document">
					{{ workspaceStore.snapshot.documentName ?? 'No file loaded' }}
				</span>
				<span
					v-if="progressPercentage !== null"
					class="text-green-600 tabular-nums whitespace-nowrap"
					data-testid="progress"
				>
					{{ workspaceStore.snapshot.documentState.progress?.label }} {{ progressPercentage }}%
				</span>

				<label
					class="flex items-center gap-1.5 text-gray-500 font-normal whitespace-nowrap cursor-pointer select-none"
					title="Stage the first transaction of the script and decide afterwards whether to commit it"
				>
					<input
						v-model="runnerStore.isPreviewEnabled"
						type="checkbox"
						class="accent-orange-500"
						data-testid="preview-toggle"
					/>
					Preview
				</label>

				<button
					class="px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
					:disabled="runnerStore.isRunning"
					data-testid="run"
					@click="runnerStore.run()"
				>
					<svg
						v-if="runnerStore.isRunning"
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
					{{
						runnerStore.status === 'checking'
							? 'Checking…'
							: runnerStore.isRunning
								? 'Running…'
								: 'Run'
					}}
				</button>
				<button
					class="px-3 py-1.5 border border-gray-300 text-gray-500 rounded hover:bg-gray-50 transition-colors"
					data-testid="reset"
					@click="resetPlayground()"
				>
					Reset
				</button>
			</div>
		</header>

		<main class="w-full font-semibold text-sm flex-1 overflow-hidden">
			<SplitterGroup id="playground-outer" direction="vertical">
				<SplitterPanel id="editors-panel" :default-size="70" :min-size="30">
					<SplitterGroup id="playground-splitter" direction="horizontal">
						<SplitterPanel id="code-panel" :default-size="50" :min-size="25">
							<div class="h-full flex flex-col">
								<div :class="PANEL_HEADER_CLASSES">
									TypeScript - <span class="text-gray-400">Ctrl/Cmd + Enter to run</span>
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
								<div :class="PANEL_HEADER_CLASSES">
									XML Output - <span class="text-gray-400">before / after the last change</span>
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

				<SplitterPanel id="console-panel" :default-size="30" :min-size="10">
					<div class="h-full flex flex-col">
						<PreviewActions
							v-if="runnerStore.pendingPreview"
							:preview="runnerStore.pendingPreview"
							@commit="runnerStore.commitPreview()"
							@discard="runnerStore.discardPreview()"
						/>
						<div class="flex-1 overflow-hidden">
							<BottomPanel />
						</div>
					</div>
				</SplitterPanel>
			</SplitterGroup>
		</main>

		<DocumentationDialog />
	</div>
</template>
