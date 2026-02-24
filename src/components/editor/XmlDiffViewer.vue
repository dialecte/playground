<script setup lang="ts">
import { shallowRef } from 'vue'
import { VueMonacoDiffEditor } from '@guolao/vue-monaco-editor'
import * as monaco from 'monaco-editor'
import { storeToRefs } from 'pinia'
import { usePlaygroundStore } from '@/stores/playground.store'
import { initMonaco } from './setup-monaco'

//====== INITIALIZE ======//

initMonaco()

const OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions = {
	automaticLayout: true,
	readOnly: true,
	minimap: { enabled: false },
	fontSize: 13,
	scrollBeyondLastLine: false,
	renderSideBySide: true,
	//useInlineViewWhenSpaceIsLimited: false,
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

const editor = shallowRef<monaco.editor.IStandaloneDiffEditor>()
const handleMount = (editorInstance: monaco.editor.IStandaloneDiffEditor) =>
	(editor.value = editorInstance)

// store
const store = usePlaygroundStore()
const { currentXmlString, previousXmlString } = storeToRefs(store)
</script>

<template>
	<VueMonacoDiffEditor
		theme="vs"
		:original="previousXmlString"
		:modified="currentXmlString"
		language="xml"
		:options="OPTIONS"
		@mount="handleMount"
	/>
</template>
