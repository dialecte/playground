import type { EventLog, PlaygroundEvent } from './event-log.types'

const STORAGE_KEY = 'dialecte-playground::event-log'
const PERSISTED_EVENT_COUNT = 500

function isPlaygroundEventList(value: unknown): value is PlaygroundEvent[] {
	return (
		Array.isArray(value) &&
		value.every(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				typeof entry.id === 'number' &&
				typeof entry.title === 'string',
		)
	)
}

/**
 * The log outlives a full page reload (a hot update of a local dialecte can fall back to one),
 * but not the tab: session storage, never local storage.
 */
export function saveEventLog(log: EventLog): void {
	try {
		const recentEvents = log.events.slice(-PERSISTED_EVENT_COUNT)
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentEvents))
	} catch {
		// Storage unavailable or full: the log simply does not survive a reload.
	}
}

export function restoreEventLog(): EventLog | null {
	try {
		const stored = sessionStorage.getItem(STORAGE_KEY)
		if (stored === null) return null

		const events: unknown = JSON.parse(stored)
		if (!isPlaygroundEventList(events)) return null

		const lastId = events.at(-1)?.id ?? 0
		return { events, nextId: lastId + 1 }
	} catch {
		return null
	}
}

export function forgetEventLog(): void {
	try {
		sessionStorage.removeItem(STORAGE_KEY)
	} catch {
		// Nothing to forget.
	}
}
