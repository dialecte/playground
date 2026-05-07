<script setup lang="ts">
import ConsolePanel from '../editor/ConsolePanel.vue'
import ActivityTab from './ActivityTab.vue'
import OutputTab from './OutputTab.vue'
import ProblemsTab from './ProblemsTab.vue'

import { storeToRefs } from 'pinia'
import { ref, computed, watch } from 'vue'

import { usePlaygroundStore } from '@/stores/playground.store'

type Tab = 'output' | 'activity' | 'problems' | 'console'

const store = usePlaygroundStore()
const { consoleEntries } = storeToRefs(store)

const activeTab = ref<Tab>('output')

const problemCount = computed(
	() =>
		store.problems.length +
		consoleEntries.value.filter((e) => e.type === 'error' || e.type === 'warn').length,
)

const hasActivity = computed(() => store.documentState.loading || store.isRunning)

watch(
	() => store.documentState.loading,
	(v) => {
		if (v) {
			activeTab.value = 'activity'
		}
	},
)

watch(
	() => store.documentState.error,
	(v) => {
		if (v) {
			activeTab.value = 'problems'
		}
	},
)

watch(
	() => store.problems.length,
	(v) => {
		if (v > 0) activeTab.value = 'problems'
	},
)

const tabs: { id: Tab; label: string }[] = [
	{ id: 'output', label: 'Output' },
	{ id: 'activity', label: 'Activity' },
	{ id: 'problems', label: 'Problems' },
	{ id: 'console', label: 'Console' },
]
</script>

<template>
	<div class="h-full flex flex-col">
		<!-- Tab header -->
		<div
			class="px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide flex items-center justify-between shrink-0">
			<div class="flex items-center gap-1">
				<button v-for="tab in tabs" :key="tab.id" :class="[
					'flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors',
					activeTab === tab.id
						? 'bg-white text-gray-700 shadow-sm ring-1 ring-black/5'
						: 'hover:text-gray-600 hover:bg-gray-100',
				]" @click="activeTab = tab.id">
					<!-- Activity spinner indicator -->
					<span v-if="tab.id === 'activity' && hasActivity"
						class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />

					{{ tab.label }}

					<!-- Output badge -->
					<span v-if="tab.id === 'output' && store.documentState.history.length"
						class="bg-gray-200 text-gray-500 rounded-full px-1.5 py-0 text-[10px] font-medium">
						{{ store.documentState.history.length }}
					</span>

					<!-- Problems badge -->
					<span v-if="tab.id === 'problems' && problemCount"
						class="bg-red-100 text-red-500 rounded-full px-1.5 py-0 text-[10px] font-medium">
						{{ problemCount }}
					</span>

					<!-- Console badge -->
					<span v-if="tab.id === 'console' && consoleEntries.length"
						class="bg-gray-200 text-gray-500 rounded-full px-1.5 py-0 text-[10px] font-medium">
						{{ consoleEntries.length }}
					</span>
				</button>
			</div>

			<!-- Clear button -->
			<button v-if="
				(activeTab === 'console' && consoleEntries.length) ||
				(activeTab === 'problems' && store.problems.length)
			" class="text-gray-400 hover:text-gray-500 transition-colors text-[10px] uppercase tracking-wide"
				@click="activeTab === 'console' ? (store.consoleEntries = []) : (store.problems = [])">
				Clear
			</button>
		</div>

		<!-- Tab content -->
		<div class="flex-1 overflow-hidden">
			<OutputTab v-if="activeTab === 'output'" />
			<ActivityTab v-else-if="activeTab === 'activity'" />
			<ProblemsTab v-else-if="activeTab === 'problems'" />
			<ConsolePanel v-else-if="activeTab === 'console'" />
		</div>
	</div>
</template>
