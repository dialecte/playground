import type { DocumentState } from '@dialecte/core'

/** The document state shown while no document is loaded. */
export const IDLE_DOCUMENT_STATE: DocumentState = {
	loading: false,
	error: null,
	progress: null,
	history: [],
	lastUpdate: null,
}
