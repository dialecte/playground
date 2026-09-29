import type { JsonValue, PlaygroundEvent } from './event-log.types'

/** Read-only surface an agent driving the browser uses instead of scraping the page. */
export type AgentBridge = {
	/** Events of the log, optionally only those logged after a known id. */
	getEvents(params?: { sinceId?: number }): PlaygroundEvent[]
	/** Snapshot of what the playground currently holds (dialecte, document, run status). */
	getState(): JsonValue
	/** Resolves once no run and no document operation is in flight. */
	whenIdle(): Promise<void>
}

export type AgentBridgeProviders = {
	readEvents: () => PlaygroundEvent[]
	readState: () => JsonValue
	isIdle: () => boolean
}

declare global {
	interface Window {
		__DIALECTE_PLAYGROUND__?: AgentBridge
	}
}
