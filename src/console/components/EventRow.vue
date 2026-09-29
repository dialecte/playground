<script setup lang="ts">
import {
	LEVEL_GLYPHS,
	LEVEL_ROW_CLASSES,
	LEVEL_TEXT_CLASSES,
	formatEventData,
	formatEventTime,
} from '../event-presentation'

import { ref } from 'vue'

import type { PlaygroundEvent } from '../event-log.types'

defineProps<{ event: PlaygroundEvent }>()

const isExpanded = ref(false)
</script>

<template>
	<div
		class="px-3 py-0.5 border-b border-gray-100 font-mono text-xs leading-5"
		:class="LEVEL_ROW_CLASSES[event.level]"
		:data-event-id="event.id"
		:data-event-source="event.source"
		:data-event-level="event.level"
	>
		<div class="flex items-start gap-2">
			<span class="shrink-0 tabular-nums text-gray-400">{{
				formatEventTime(event.timestamp)
			}}</span>
			<span class="shrink-0 w-3 text-center select-none" :class="LEVEL_TEXT_CLASSES[event.level]">
				{{ LEVEL_GLYPHS[event.level] }}
			</span>
			<span class="shrink-0 w-16 text-[10px] uppercase tracking-wide text-orange-500">
				{{ event.source }}
			</span>
			<span class="flex-1 whitespace-pre-wrap break-words" :class="LEVEL_TEXT_CLASSES[event.level]">
				{{ event.title }}
				<span v-if="event.detail" class="text-gray-500"> - {{ event.detail }}</span>
			</span>
			<button
				v-if="event.data !== undefined"
				class="shrink-0 text-[10px] uppercase tracking-wide text-gray-400 hover:text-orange-500"
				@click="isExpanded = !isExpanded"
			>
				{{ isExpanded ? 'Hide' : 'Data' }}
			</button>
		</div>
		<pre
			v-if="isExpanded && event.data !== undefined"
			class="mt-1 ml-[7.5rem] p-2 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-700 overflow-x-auto"
			>{{ formatEventData(event.data) }}</pre
		>
	</div>
</template>
