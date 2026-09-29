import { createFrameCoalescer } from './create-frame-coalescer'

import { describe, expect, it } from 'vitest'

function createHarness() {
	let flushCount = 0
	const scheduledFrames: Array<() => void> = []

	const onFrame = createFrameCoalescer({
		flush: () => {
			flushCount += 1
		},
		scheduleFrame: (callback) => {
			scheduledFrames.push(callback)
		},
	})

	function runScheduledFrames(): void {
		const frames = scheduledFrames.splice(0)
		for (const frame of frames) frame()
	}

	return {
		onFrame,
		runScheduledFrames,
		readFlushCount: () => flushCount,
		readScheduledFrameCount: () => scheduledFrames.length,
	}
}

describe('createFrameCoalescer', () => {
	it('flushes a terminal frame immediately', () => {
		const harness = createHarness()

		harness.onFrame(true)

		expect(harness.readFlushCount()).toBe(1)
		expect(harness.readScheduledFrameCount()).toBe(0)
	})

	it('coalesces a burst of progress frames into one flush at the next paint', () => {
		const harness = createHarness()

		harness.onFrame(false)
		harness.onFrame(false)
		harness.onFrame(false)

		expect(harness.readFlushCount()).toBe(0)
		expect(harness.readScheduledFrameCount()).toBe(1)

		harness.runScheduledFrames()

		expect(harness.readFlushCount()).toBe(1)
	})

	it('schedules again once the queued frame ran', () => {
		const harness = createHarness()

		harness.onFrame(false)
		harness.runScheduledFrames()
		harness.onFrame(false)
		harness.runScheduledFrames()

		expect(harness.readFlushCount()).toBe(2)
	})

	it('drops a queued progress frame when the operation settled in the meantime', () => {
		const harness = createHarness()

		harness.onFrame(false)
		harness.onFrame(true)
		harness.runScheduledFrames()

		expect(harness.readFlushCount()).toBe(1)
	})

	it('still coalesces the operation that follows a settled one', () => {
		const harness = createHarness()

		harness.onFrame(false)
		harness.onFrame(true)
		harness.runScheduledFrames()
		harness.onFrame(false)
		harness.runScheduledFrames()

		expect(harness.readFlushCount()).toBe(2)
	})
})
