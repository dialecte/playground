<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { usePlaygroundStore } from '@/stores/playground.store'

const store = usePlaygroundStore()
const bottom = ref<HTMLElement | null>(null)

watch(
	() => store.documentState.history.length,
	async () => {
		await nextTick()
		bottom.value?.scrollIntoView({ behavior: 'smooth' })
	},
)

function formatTime(ts: number) {
	return new Date(ts).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
}

const METHOD_COLOR: Record<string, string> = {
	commit: 'text-green-400',
	undo: 'text-yellow-400',
	redo: 'text-blue-400',
	destroy: 'text-red-400',
}

function methodColor(method: string) {
	return METHOD_COLOR[method] ?? 'text-orange-400'
}
</script>

<template>
	<div class="h-full overflow-y-auto font-mono text-xs leading-5 p-2 space-y-0.5">
		<div v-if="!store.documentState.history.length" class="text-gray-600 italic p-2">
			No transactions yet. Run some code to see the output.
		</div>

		<div
			v-for="(entry, i) in store.documentState.history"
			:key="i"
			class="flex items-start gap-3 px-1 py-0.5 rounded hover:bg-white/5"
		>
			<span class="text-gray-600 shrink-0 tabular-nums">{{ formatTime(entry.timestamp) }}</span>
			<span :class="['shrink-0 w-14', methodColor(entry.method)]">{{ entry.method }}</span>
			<span class="text-gray-300">{{ entry.message }}</span>
			<span v-if="entry.ref" class="text-gray-600 ml-auto shrink-0">
				&lt;{{ entry.ref.tagName }} id="{{ entry.ref.id }}"&gt;
			</span>
		</div>

		<div ref="bottom" />
	</div>
</template>
