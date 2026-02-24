<script setup lang="ts">
import { shallowRef } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import * as monaco from 'monaco-editor'
import { storeToRefs } from 'pinia'
import { usePlaygroundStore } from '@/stores/playground.store'
import { initMonaco } from './setup-monaco'

//====== INITIALIZE ======//

initMonaco()

const OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
	automaticLayout: true,
	formatOnType: true,
	formatOnPaste: true,
	minimap: { enabled: false },
	fontSize: 13,
	tabSize: 2,
	scrollBeyondLastLine: false,
	lineNumbers: 'on',
	renderWhitespace: 'selection',
	wordWrap: 'on',
}

const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>()

const handleMount = (editorInstance: monaco.editor.IStandaloneCodeEditor) => {
	editor.value = editorInstance

	// Ctrl/Cmd+Enter to run
	editorInstance.addAction({
		id: 'run-code',
		label: 'Run Code',
		keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
		run: () => store.run(),
	})
}

// store
const store = usePlaygroundStore()
const { code } = storeToRefs(store)
</script>

<template>
	<VueMonacoEditor
		v-model:value="code"
		theme="vs"
		language="typescript"
		path="file:///playground.ts"
		:options="OPTIONS"
		@mount="handleMount"
	/>
</template>
