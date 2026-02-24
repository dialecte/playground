<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaygroundStore, type ConsoleEntry } from '@/stores/playground.store'

const store = usePlaygroundStore()
const { consoleEntries } = storeToRefs(store)
const scrollContainer = ref<HTMLElement>()

watch(
	consoleEntries,
	async () => {
		await nextTick()
		if (scrollContainer.value) {
			scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
		}
	},
	{ deep: true },
)

function formatArg(arg: unknown): string {
	if (typeof arg === 'string') return arg
	try {
		return JSON.stringify(arg, null, 2)
	} catch {
		return String(arg)
	}
}

function formatEntry(entry: ConsoleEntry): string {
	return entry.args.map(formatArg).join(' ')
}

function entryColor(type: ConsoleEntry['type']): string {
	switch (type) {
		case 'error':
			return 'text-red-600'
		case 'warn':
			return 'text-yellow-600'
		case 'info':
			return 'text-blue-600'
		default:
			return 'text-gray-800'
	}
}

function entryBg(type: ConsoleEntry['type']): string {
	switch (type) {
		case 'error':
			return 'bg-red-50'
		case 'warn':
			return 'bg-yellow-50'
		default:
			return ''
	}
}
</script>

<template>
	<div class="h-full flex flex-col bg-white">
		<div ref="scrollContainer" class="flex-1 overflow-auto font-mono text-xs">
			<div v-if="consoleEntries.length === 0" class="px-3 py-2 text-gray-400 italic">
				Console output will appear here after running code...
			</div>
			<div
				v-for="(entry, i) in consoleEntries"
				:key="i"
				class="px-3 py-0.5 border-b border-gray-100 whitespace-pre-wrap"
				:class="[entryColor(entry.type), entryBg(entry.type)]"
			>
				<span class="select-none opacity-40 mr-2">{{ entry.type === 'log' ? '›' : entry.type === 'warn' ? '⚠' : entry.type === 'error' ? '✕' : 'ℹ' }}</span>{{ formatEntry(entry) }}
			</div>
		</div>
	</div>
</template>
