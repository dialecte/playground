export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

/** Which part of the playground produced the event. */
export type EventSource =
	| 'lifecycle'
	| 'io'
	| 'channel'
	| 'state'
	| 'history'
	| 'preview'
	| 'problem'
	| 'user'
	| 'run'
	| 'perf'

export type EventLevel = 'debug' | 'info' | 'success' | 'warning' | 'error'

export type PlaygroundEvent = {
	id: number
	timestamp: number
	source: EventSource
	level: EventLevel
	/** Short headline shown on the row. */
	title: string
	/** Secondary, developer-facing text. */
	detail?: string
	/** Structured payload, already safe to serialize. */
	data?: JsonValue
	/**
	 * High-frequency events (progress frames) share a key: a new one REPLACES the previous event
	 * when that event is still the last of the log, instead of flooding it.
	 */
	coalesceKey?: string
}

export type EventDraft = Omit<PlaygroundEvent, 'id' | 'timestamp'>

export type EventLog = {
	events: PlaygroundEvent[]
	nextId: number
}

export type ConsoleView = 'all' | 'output' | 'activity' | 'problems'

export type ConsoleBadges = Record<ConsoleView, number>

export type AppendEventParams = {
	draft: EventDraft
	timestamp: number
	/** Oldest events are dropped beyond this count. */
	capacity: number
}

export type EventListener = (draft: EventDraft) => void
