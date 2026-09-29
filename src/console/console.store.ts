import { appendEvent, countBadges, createEventLog, selectEvents } from './event-log'
import { forgetEventLog, restoreEventLog, saveEventLog } from './event-log-persistence'
import { subscribeToEvents } from './event-sink'

import { useDebounceFn } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import type { ConsoleView, EventDraft, EventLog } from './event-log.types'

const LOG_CAPACITY = 2000
const PERSISTENCE_DELAY_IN_MILLISECONDS = 300

export const useConsoleStore = defineStore('console', () => {
	const log = shallowRef<EventLog>(restoreEventLog() ?? createEventLog())
	const activeView = ref<ConsoleView>('all')

	const visibleEvents = computed(() => selectEvents(log.value, { view: activeView.value }))
	const badges = computed(() => countBadges(log.value))

	const persistLog = useDebounceFn(function persistLog(): void {
		saveEventLog(log.value)
	}, PERSISTENCE_DELAY_IN_MILLISECONDS)

	function recordEvent(draft: EventDraft): void {
		log.value = appendEvent(log.value, { draft, timestamp: Date.now(), capacity: LOG_CAPACITY })
		persistLog()
	}

	function clearLog(): void {
		log.value = { events: [], nextId: log.value.nextId }
		forgetEventLog()
	}

	function showView(view: ConsoleView): void {
		activeView.value = view
	}

	subscribeToEvents(recordEvent)

	return { log, activeView, visibleEvents, badges, clearLog, showView }
})
