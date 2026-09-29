import { appendEvent, countBadges, createEventLog, selectEvents } from './event-log'

import { describe, expect, it } from 'vitest'

import type { EventDraft, EventLog } from './event-log.types'

const CAPACITY = 100

function appendAll(drafts: EventDraft[], capacity: number = CAPACITY): EventLog {
	let log = createEventLog()
	let timestamp = 1000
	for (const draft of drafts) {
		log = appendEvent(log, { draft, timestamp, capacity })
		timestamp += 1
	}
	return log
}

const IMPORT_DONE: EventDraft = { source: 'io', level: 'success', title: 'Imported station.scd' }
const COMMIT: EventDraft = { source: 'history', level: 'info', title: 'commit' }
const CHANNEL_COMMIT: EventDraft = { source: 'channel', level: 'debug', title: 'commit' }
const USER_LOG: EventDraft = { source: 'user', level: 'info', title: 'hello' }
const USER_WARNING: EventDraft = { source: 'user', level: 'warning', title: 'careful' }
const PROBLEM: EventDraft = { source: 'problem', level: 'error', title: 'ELEMENT_NOT_FOUND' }

describe('appendEvent', () => {
	it('assigns increasing ids and the given timestamp', () => {
		const log = appendAll([IMPORT_DONE, COMMIT])

		expect(log.events.map((event) => event.id)).toEqual([1, 2])
		expect(log.events.map((event) => event.timestamp)).toEqual([1000, 1001])
		expect(log.nextId).toBe(3)
	})

	it('does not mutate the log it receives', () => {
		const before = createEventLog()
		const after = appendEvent(before, { draft: COMMIT, timestamp: 1, capacity: CAPACITY })

		expect(before.events).toHaveLength(0)
		expect(after).not.toBe(before)
	})

	it('drops the oldest events beyond the capacity', () => {
		const log = appendAll([IMPORT_DONE, COMMIT, USER_LOG], 2)

		expect(log.events.map((event) => event.title)).toEqual(['commit', 'hello'])
		expect(log.events.map((event) => event.id)).toEqual([2, 3])
	})

	describe('coalescing', () => {
		const PROGRESS_START: EventDraft = {
			source: 'state',
			level: 'info',
			title: 'Cloning 1 / 10',
			coalesceKey: 'progress',
		}
		const PROGRESS_NEXT: EventDraft = { ...PROGRESS_START, title: 'Cloning 2 / 10' }

		it('replaces the last event when it carries the same key, keeping its id', () => {
			const log = appendAll([COMMIT, PROGRESS_START, PROGRESS_NEXT])

			expect(log.events.map((event) => event.title)).toEqual(['commit', 'Cloning 2 / 10'])
			expect(log.events[1]?.id).toBe(2)
			expect(log.events[1]?.timestamp).toBe(1002)
			expect(log.nextId).toBe(3)
		})

		it('appends when another event was logged in between', () => {
			const log = appendAll([PROGRESS_START, USER_LOG, PROGRESS_NEXT])

			expect(log.events.map((event) => event.title)).toEqual([
				'Cloning 1 / 10',
				'hello',
				'Cloning 2 / 10',
			])
		})

		it('appends when the last event carries a different key', () => {
			const otherKey: EventDraft = { ...PROGRESS_NEXT, coalesceKey: 'perf' }
			const log = appendAll([PROGRESS_START, otherKey])

			expect(log.events).toHaveLength(2)
		})
	})
})

describe('selectEvents', () => {
	const log = appendAll([IMPORT_DONE, COMMIT, CHANNEL_COMMIT, USER_LOG, USER_WARNING, PROBLEM])

	it.each([
		{
			view: 'all' as const,
			expected: [
				'Imported station.scd',
				'commit',
				'commit',
				'hello',
				'careful',
				'ELEMENT_NOT_FOUND',
			],
		},
		{ view: 'output' as const, expected: ['Imported station.scd', 'commit', 'hello', 'careful'] },
		{ view: 'activity' as const, expected: ['commit'] },
		{ view: 'problems' as const, expected: ['careful', 'ELEMENT_NOT_FOUND'] },
	])('keeps the events of the $view view in order', ({ view, expected }) => {
		const titles = selectEvents(log, { view }).map((event) => event.title)

		expect(titles).toEqual(expected)
	})
})

describe('countBadges', () => {
	it('counts the events of every view', () => {
		const log = appendAll([IMPORT_DONE, COMMIT, CHANNEL_COMMIT, USER_LOG, USER_WARNING, PROBLEM])

		expect(countBadges(log)).toEqual({ all: 6, output: 4, activity: 1, problems: 2 })
	})

	it('is all zeros for an empty log', () => {
		expect(countBadges(createEventLog())).toEqual({ all: 0, output: 0, activity: 0, problems: 0 })
	})
})
