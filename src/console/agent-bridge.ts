import type { AgentBridge, AgentBridgeProviders } from './agent-bridge.types'
import type { PlaygroundEvent } from './event-log.types'

const IDLE_POLLING_INTERVAL_IN_MILLISECONDS = 50

function cloneEvents(events: PlaygroundEvent[]): PlaygroundEvent[] {
	return structuredClone(events)
}

/**
 * Expose the log as data. Every getter hands out a COPY: nothing the page holds can be mutated
 * from the outside.
 */
export function installAgentBridge(providers: AgentBridgeProviders): void {
	const bridge: AgentBridge = {
		getEvents(params) {
			const sinceId = params?.sinceId ?? 0
			const recentEvents = providers.readEvents().filter((event) => event.id > sinceId)
			return cloneEvents(recentEvents)
		},
		getState() {
			return structuredClone(providers.readState())
		},
		whenIdle() {
			return new Promise<void>((resolve) => {
				function resolveWhenIdle(): void {
					if (providers.isIdle()) {
						resolve()
						return
					}
					setTimeout(resolveWhenIdle, IDLE_POLLING_INTERVAL_IN_MILLISECONDS)
				}
				resolveWhenIdle()
			})
		},
	}

	window.__DIALECTE_PLAYGROUND__ = Object.freeze(bridge)
}
