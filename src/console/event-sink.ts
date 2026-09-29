import type { EventDraft, EventListener } from './event-log.types'

/**
 * Plain publish/subscribe between the services that OBSERVE Dialecte and the store that SHOWS
 * what they saw. Services stay free of any reactive import; the store is just one listener.
 */
const listeners = new Set<EventListener>()

/** Events published before the first listener exists (services start before the UI mounts). */
let pendingDrafts: EventDraft[] = []

export function publishEvent(draft: EventDraft): void {
	if (listeners.size === 0) {
		pendingDrafts.push(draft)
		return
	}
	for (const listener of listeners) listener(draft)
}

export function subscribeToEvents(listener: EventListener): () => void {
	listeners.add(listener)

	const replayedDrafts = pendingDrafts
	pendingDrafts = []
	for (const draft of replayedDrafts) listener(draft)

	return function unsubscribe(): void {
		listeners.delete(listener)
	}
}

/** Test seam: forget every listener and buffered event. */
export function resetEventSink(): void {
	listeners.clear()
	pendingDrafts = []
}
