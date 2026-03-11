<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePlaygroundStore } from '@/stores/playground.store'

const store = usePlaygroundStore()

// Braille spinner frames
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '��', '⠦', '⠧', '⠇', '⠏']
const spinnerFrame = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	intervalId = setInterval(() => {
		spinnerFrame.value = (spinnerFrame.value + 1) % FRAMES.length
	}, 80)
})

onUnmounted(() => {
	if (intervalId !== null) clearInterval(intervalId)
})

function asciiBar(current: number, total: number, width = 24): string {
	const filled = Math.round((current / total) * width)
	return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']'
}

function pct(current: number, total: number) {
	return Math.round((current / total) * 100)
}
</script>

<template>
	<div class="h-full font-mono text-xs p-3 space-y-3 overflow-y-auto">
		<!-- Idle state -->
		<div
			v-if="!store.documentState.activity && !store.documentState.progress && !store.isRunning"
			class="text-gray-600 italic"
		>
			Idle — waiting for next transaction.
		</div>

		<!-- Runner activity (user code executing) -->
		<div
			v-if="store.isRunning && !store.documentState.activity"
			class="flex items-center gap-2 text-orange-400"
		>
			<span class="text-lg leading-none">{{ FRAMES[spinnerFrame] }}</span>
			<span>Running user code…</span>
		</div>

		<!-- Document activity (commit / undo / redo) -->
		<div v-if="store.documentState.activity" class="space-y-2">
			<div class="flex items-center gap-2 text-green-400">
				<span class="text-lg leading-none">{{ FRAMES[spinnerFrame] }}</span>
				<span class="text-gray-400 w-14">{{ store.documentState.activity.method }}</span>
				<span class="text-gray-300">{{ store.documentState.activity.message }}</span>
			</div>

			<!-- Progress bar -->
			<div v-if="store.documentState.progress" class="pl-8 space-y-0.5">
				<div class="text-gray-400">
					{{ asciiBar(store.documentState.progress.current, store.documentState.progress.total) }}
					<span class="ml-2 text-green-400">
						{{ pct(store.documentState.progress.current, store.documentState.progress.total) }}%
					</span>
				</div>
				<div class="text-gray-600 text-[10px]">
					{{ store.documentState.progress.current }} /
					{{ store.documentState.progress.total }} records
				</div>
			</div>
		</div>

		<!-- Last update -->
		<div
			v-if="store.documentState.lastUpdate"
			class="text-gray-600 text-[10px] border-t border-white/10 pt-2"
		>
			Last update:
			{{
				new Date(store.documentState.lastUpdate).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
				})
			}}
		</div>
	</div>
</template>
