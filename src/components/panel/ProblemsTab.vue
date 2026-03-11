<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaygroundStore } from '@/stores/playground.store'

const store = usePlaygroundStore()
const { consoleEntries } = storeToRefs(store)

const errorAndWarnEntries = computed(() =>
	consoleEntries.value.filter((e) => e.type === 'error' || e.type === 'warn'),
)

const dialecteError = computed(() => store.documentState.error)

function formatArg(arg: unknown): string {
	if (typeof arg === 'string') return arg
	try {
		return JSON.stringify(arg)
	} catch {
		return String(arg)
	}
}

function formatArgs(args: unknown[]): string {
	return args.map(formatArg).join(' ')
}
</script>

<template>
	<div class="h-full font-mono text-xs overflow-y-auto">
		<!-- Empty state -->
		<div
			v-if="!dialecteError && errorAndWarnEntries.length === 0"
			class="px-3 py-2 text-gray-500 italic"
		>
			No problems detected.
		</div>

		<!-- DialecteError from doc.state -->
		<div
			v-if="dialecteError"
			class="px-3 py-2 border-b border-red-900/30 bg-red-950/30 space-y-0.5"
		>
			<div class="flex items-center gap-2 text-red-400">
				<span class="select-none">✕</span>
				<span class="font-semibold">{{ dialecteError.key }}</span>
				<span class="text-gray-500 text-[10px]">code {{ dialecteError.code }}</span>
				<span class="text-gray-500 text-[10px] ml-auto">{{ dialecteError.method }}</span>
			</div>
			<div class="pl-5 text-red-300">{{ dialecteError.detail }}</div>
			<div v-if="dialecteError.cause" class="pl-5 text-gray-600 text-[10px] whitespace-pre-wrap">
				{{ dialecteError.cause.message }}
			</div>
		</div>

		<!-- Console errors & warnings -->
		<div
			v-for="(entry, i) in errorAndWarnEntries"
			:key="i"
			class="px-3 py-1 border-b flex items-start gap-2"
			:class="
				entry.type === 'error'
					? 'border-red-900/20 text-red-400'
					: 'border-yellow-900/20 text-yellow-400'
			"
		>
			<span class="select-none pt-px">{{ entry.type === 'error' ? '✕' : '⚠' }}</span>
			<span class="flex-1 whitespace-pre-wrap break-all">{{ formatArgs(entry.args) }}</span>
			<span class="text-gray-600 text-[10px] shrink-0">
				{{
					new Date(entry.timestamp).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
					})
				}}
			</span>
		</div>
	</div>
</template>
