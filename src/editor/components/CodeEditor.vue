<script setup lang="ts">
import { SCRIPT_MODEL_PATH, initMonaco } from '../monaco-setup'

import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { storeToRefs } from 'pinia'

import { useRunnerStore } from '@/runner/runner.store'

import type * as monaco from 'monaco-editor'

initMonaco()

const EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
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

const runnerStore = useRunnerStore()
const { script } = storeToRefs(runnerStore)
</script>

<template>
	<VueMonacoEditor
		v-model:value="script"
		theme="vs"
		language="typescript"
		:path="SCRIPT_MODEL_PATH"
		:options="EDITOR_OPTIONS"
	/>
</template>
