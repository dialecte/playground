import type {
	AppendEventParams,
	ConsoleBadges,
	ConsoleView,
	EventLog,
	EventSource,
	PlaygroundEvent,
} from './event-log.types'

/** What the user asked for and what it produced. */
const OUTPUT_SOURCES: ReadonlySet<EventSource> = new Set([
	'run',
	'history',
	'io',
	'preview',
	'user',
])

/** What the engine is doing underneath. */
const ACTIVITY_SOURCES: ReadonlySet<EventSource> = new Set([
	'lifecycle',
	'state',
	'channel',
	'perf',
])

const CONSOLE_VIEWS: readonly ConsoleView[] = ['all', 'output', 'activity', 'problems']

export function createEventLog(): EventLog {
	return { events: [], nextId: 1 }
}

function isInView(event: PlaygroundEvent, view: ConsoleView): boolean {
	if (view === 'all') return true
	if (view === 'problems') return event.level === 'warning' || event.level === 'error'
	if (view === 'output') return OUTPUT_SOURCES.has(event.source)
	return ACTIVITY_SOURCES.has(event.source)
}

/** Append an event, or replace the last one when both carry the same coalesce key. */
export function appendEvent(log: EventLog, params: AppendEventParams): EventLog {
	const { draft, timestamp, capacity } = params
	const lastEvent = log.events.at(-1)

	const replacesLastEvent =
		draft.coalesceKey !== undefined &&
		lastEvent !== undefined &&
		lastEvent.coalesceKey === draft.coalesceKey

	if (replacesLastEvent) {
		const replacement: PlaygroundEvent = { ...draft, id: lastEvent.id, timestamp }
		return { events: [...log.events.slice(0, -1), replacement], nextId: log.nextId }
	}

	const appended: PlaygroundEvent = { ...draft, id: log.nextId, timestamp }
	const events = [...log.events, appended]
	const overflow = Math.max(0, events.length - capacity)

	return { events: overflow > 0 ? events.slice(overflow) : events, nextId: log.nextId + 1 }
}

export function selectEvents(log: EventLog, params: { view: ConsoleView }): PlaygroundEvent[] {
	return log.events.filter((event) => isInView(event, params.view))
}

export function countBadges(log: EventLog): ConsoleBadges {
	const badges: ConsoleBadges = { all: 0, output: 0, activity: 0, problems: 0 }
	for (const event of log.events) {
		for (const view of CONSOLE_VIEWS) {
			if (isInView(event, view)) badges[view] += 1
		}
	}
	return badges
}
