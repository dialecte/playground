<script setup lang="ts">
import { initMonaco } from '../monaco-setup'

import { VueMonacoDiffEditor } from '@guolao/vue-monaco-editor'
import { storeToRefs } from 'pinia'

import { useWorkspaceStore } from '@/workspace/workspace.store'

import type * as monaco from 'monaco-editor'

initMonaco()

const DIFF_EDITOR_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions = {
	automaticLayout: true,
	readOnly: true,
	minimap: { enabled: false },
	fontSize: 13,
	scrollBeyondLastLine: false,
	renderSideBySide: true,
	hideUnchangedRegions: {
		enabled: true,
		minimumLineCount: 3,
		contextLineCount: 2,
	},
	folding: true,
	foldingStrategy: 'indentation',
	showFoldingControls: 'always',
	wordWrap: 'on',
}

const workspaceStore = useWorkspaceStore()
const { currentXml, previousXml } = storeToRefs(workspaceStore)
</script>

<template>
	<VueMonacoDiffEditor
		theme="vs"
		:original="previousXml"
		:modified="currentXml"
		language="xml"
		:options="DIFF_EDITOR_OPTIONS"
	/>
</template>
