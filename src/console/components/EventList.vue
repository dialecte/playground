<script setup lang="ts">
import EventRow from './EventRow.vue'

import { nextTick, ref, watch } from 'vue'

import type { PlaygroundEvent } from '../event-log.types'

const props = defineProps<{ events: PlaygroundEvent[]; emptyMessage: string }>()

const scrollContainer = ref<HTMLElement>()

async function scrollToLatestEvent(): Promise<void> {
	await nextTick()
	if (scrollContainer.value) scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
}

watch(() => props.events, scrollToLatestEvent)
</script>

<template>
	<div ref="scrollContainer" class="h-full overflow-y-auto bg-white">
		<div v-if="events.length === 0" class="px-3 py-2 font-mono text-xs text-gray-400 italic">
			{{ emptyMessage }}
		</div>
		<EventRow v-for="event in events" :key="event.id" :event="event" />
	</div>
</template>
