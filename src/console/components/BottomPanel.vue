<script setup lang="ts">
import { useConsoleStore } from '../console.store'
import { CONSOLE_VIEW_LABELS } from '../event-presentation'
import EventList from './EventList.vue'

import { storeToRefs } from 'pinia'

import type { ConsoleView } from '../event-log.types'

const CONSOLE_VIEWS: ConsoleView[] = ['all', 'output', 'activity', 'problems']

const EMPTY_MESSAGES: Record<ConsoleView, string> = {
	all: 'Nothing happened yet. Open a file or run the script.',
	output: 'No output yet. Run the script to see what it produced.',
	activity: 'The engine has been quiet so far.',
	problems: 'No problems detected.',
}

const consoleStore = useConsoleStore()
const { activeView, visibleEvents, badges } = storeToRefs(consoleStore)
</script>

<template>
	<div class="h-full flex flex-col">
		<div
			class="px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 uppercase tracking-wide flex items-center justify-between shrink-0"
		>
			<div class="flex items-center gap-1" role="tablist">
				<button
					v-for="view in CONSOLE_VIEWS"
					:key="view"
					role="tab"
					:aria-selected="activeView === view"
					:class="[
						'flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors',
						activeView === view
							? 'bg-white text-gray-700 shadow-sm ring-1 ring-black/5'
							: 'hover:text-gray-600 hover:bg-gray-100',
					]"
					@click="consoleStore.showView(view)"
				>
					{{ CONSOLE_VIEW_LABELS[view] }}
					<span
						v-if="badges[view] > 0"
						:class="[
							'rounded-full px-1.5 py-0 text-[10px] font-medium',
							view === 'problems' ? 'bg-red-100 text-red-500' : 'bg-gray-200 text-gray-500',
						]"
					>
						{{ badges[view] }}
					</span>
				</button>
			</div>

			<button
				v-if="badges.all > 0"
				class="text-gray-400 hover:text-gray-500 transition-colors text-[10px] uppercase tracking-wide"
				@click="consoleStore.clearLog()"
			>
				Clear
			</button>
		</div>

		<div class="flex-1 overflow-hidden">
			<EventList :events="visibleEvents" :empty-message="EMPTY_MESSAGES[activeView]" />
		</div>
	</div>
</template>
