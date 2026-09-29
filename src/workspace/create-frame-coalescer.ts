import type { FrameCoalescerParams } from './workspace.types'

/**
 * Adapter between a document's change signal and whatever shows its state.
 *
 * The engine signals EVERY change - thousands of progress steps for a large operation. The last
 * frame of an operation is flushed at once so a settled state is never delayed; the frames before
 * it collapse into one flush per paint. A queued frame that an operation's end overtook is dropped:
 * a mid-operation state must never land after the settled one.
 */
export function createFrameCoalescer(params: FrameCoalescerParams): (terminal: boolean) => void {
	const { flush, scheduleFrame } = params

	let isFrameQueued = false
	let settledOperationCount = 0

	return function onFrame(terminal: boolean): void {
		if (terminal) {
			settledOperationCount += 1
			flush()
			return
		}

		if (isFrameQueued) return
		isFrameQueued = true

		const settledCountWhenQueued = settledOperationCount
		scheduleFrame(function runQueuedFrame(): void {
			isFrameQueued = false
			if (settledCountWhenQueued !== settledOperationCount) return
			flush()
		})
	}
}
