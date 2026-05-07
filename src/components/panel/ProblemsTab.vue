<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaygroundStore } from '@/stores/playground.store'

const store = usePlaygroundStore()
const { consoleEntries, problems } = storeToRefs(store)

const runtimeErrors = computed(() =>
	consoleEntries.value.filter((e) => e.type === 'error' || e.type === 'warn'),
)

function formatArgs(args: unknown[]): string {
	return args
		.map((a) => {
			if (typeof a === 'string') return a
			try {
				return JSON.stringify(a)
			} catch {
				return String(a)
			}
		})
		.join(' ')
}
</script>

<template>
	<div class="h-full font-mono text-xs overflow-y-auto">
		<!-- Empty state -->
		<div v-if="!problems.length && !runtimeErrors.length" class="px-3 py-2 text-gray-500 italic">
			No problems detected.
		</div>

		<!-- Structured DialecteErrors (invariant violations) -->
		<div v-if="problems.length" class="border-b border-gray-200">
			<div v-for="(problem, i) in problems" :key="i"
				class="px-3 py-2 border-b border-red-100 last:border-b-0 space-y-0.5 hover:bg-red-50/50">
				<div class="flex items-center gap-2">
					<span class="select-none text-red-400">&#x2715;</span>
					<span class="font-semibold text-gray-800">{{ problem.key }}</span>
					<span class="bg-gray-100 text-gray-500 rounded px-1 py-0 text-[10px] font-mono">
						{{ problem.code }}
					</span>
					<span class="text-gray-400 text-[10px] ml-auto font-mono">
						{{ problem.method }}
					</span>
				</div>
				<div class="pl-5 text-gray-700">{{ problem.message }}</div>
				<div class="pl-5 text-gray-500 text-[10px]">{{ problem.detail }}</div>
				<div v-if="problem.ref" class="pl-5 flex items-center gap-1 text-[10px] text-blue-500">
					<span class="bg-blue-50 rounded px-1">&lt;{{ problem.ref.tagName }}&gt;</span>
					<span class="text-gray-400">id={{ problem.ref.id }}</span>
				</div>
			</div>
		</div>

		<!-- Runtime console errors & warnings -->
		<div v-if="runtimeErrors.length">
			<div v-if="problems.length"
				class="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide bg-gray-50 border-b">
				Runtime
			</div>
			<div v-for="(entry, i) in runtimeErrors" :key="'rt-' + i" class="px-3 py-1 border-b flex items-start gap-2"
				:class="entry.type === 'error'
						? 'border-red-100 text-red-500'
						: 'border-yellow-100 text-yellow-600'
					">
				<span class="select-none pt-px">{{
					entry.type === 'error' ? '\u2715' : '\u26A0'
				}}</span>
				<span class="flex-1 whitespace-pre-wrap break-all text-gray-700">{{
					formatArgs(entry.args)
				}}</span>
				<span class="text-gray-400 text-[10px] shrink-0">
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
	</div>
</template>
