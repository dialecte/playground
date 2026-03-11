<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaygroundStore } from '@/stores/playground.store'
import OutputTab from './OutputTab.vue'
import ActivityTab from './ActivityTab.vue'
import ProblemsTab from './ProblemsTab.vue'
import ConsolePanel from '../editor/ConsolePanel.vue'

type Tab = 'output' | 'activity' | 'problems' | 'console'

const store = usePlaygroundStore()
const { consoleEntries } = storeToRefs(store)

const activeTab = ref<Tab>('output')

const problemCount = computed(
	() =>
		consoleEntries.value.filter((e) => e.type === 'error' || e.type === 'warn').length +
		(store.documentState.error ? 1 : 0),
)

const hasActivity = computed(() => store.documentState.activity !== null || store.isRunning)

watch(
	() => store.documentState.activity,
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
			class="px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide flex items-center justify-between shrink-0"
		>
			<div class="flex items-center gap-1">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					:class="[
						'flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors',
						activeTab === tab.id
							? 'bg-white text-gray-700 shadow-sm ring-1 ring-black/5'
							: 'hover:text-gray-600 hover:bg-gray-100',
					]"
					@click="activeTab = tab.id"
				>
					<!-- Activity spinner indicator -->
					<span
						v-if="tab.id === 'activity' && hasActivity"
						class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
					/>

					{{ tab.label }}

					<!-- Output badge -->
					<span
						v-if="tab.id === 'output' && store.documentState.history.length"
						class="bg-gray-200 text-gray-500 rounded-full px-1.5 py-0 text-[10px] font-medium"
					>
						{{ store.documentState.history.length }}
					</span>

					<!-- Problems badge -->
					<span
						v-if="tab.id === 'problems' && problemCount"
						class="bg-red-100 text-red-500 rounded-full px-1.5 py-0 text-[10px] font-medium"
					>
						{{ problemCount }}
					</span>

					<!-- Console badge -->
					<span
						v-if="tab.id === 'console' && consoleEntries.length"
						class="bg-gray-200 text-gray-500 rounded-full px-1.5 py-0 text-[10px] font-medium"
					>
						{{ consoleEntries.length }}
					</span>
				</button>
			</div>

			<!-- Clear button for console tab -->
			<button
				v-if="activeTab === 'console' && consoleEntries.length"
				class="text-gray-400 hover:text-gray-500 transition-colors text-[10px] uppercase tracking-wide"
				@click="store.consoleEntries = []"
			>
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
