import { publishEvent, resetEventSink, subscribeToEvents } from './event-sink'

import { beforeEach, describe, expect, it } from 'vitest'

import type { EventDraft } from './event-log.types'

const FIRST: EventDraft = { source: 'lifecycle', level: 'info', title: 'first' }
const SECOND: EventDraft = { source: 'lifecycle', level: 'info', title: 'second' }

describe('event sink', () => {
	beforeEach(() => {
		resetEventSink()
	})

	it('delivers a published event to every subscriber', () => {
		const receivedByFirst: EventDraft[] = []
		const receivedBySecond: EventDraft[] = []
		subscribeToEvents((draft) => receivedByFirst.push(draft))
		subscribeToEvents((draft) => receivedBySecond.push(draft))

		publishEvent(FIRST)

		expect(receivedByFirst).toEqual([FIRST])
		expect(receivedBySecond).toEqual([FIRST])
	})

	it('stops delivering after unsubscribe', () => {
		const received: EventDraft[] = []
		const unsubscribe = subscribeToEvents((draft) => received.push(draft))

		unsubscribe()
		publishEvent(FIRST)

		expect(received).toEqual([])
	})

	it('buffers events published before anyone listens and replays them in order once', () => {
		publishEvent(FIRST)
		publishEvent(SECOND)

		const receivedByFirst: EventDraft[] = []
		const receivedBySecond: EventDraft[] = []
		subscribeToEvents((draft) => receivedByFirst.push(draft))
		subscribeToEvents((draft) => receivedBySecond.push(draft))

		expect(receivedByFirst).toEqual([FIRST, SECOND])
		expect(receivedBySecond).toEqual([])
	})
})
