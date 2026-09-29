import type { EventDraft } from '@/console/event-log.types'
import type { LoadedDialecte } from '@/dialecte-registry/dialecte-registry.types'
import type { AnyDialecteConfig, Document, DocumentState, Project } from '@dialecte/core'

export type DocumentProgress = NonNullable<DocumentState['progress']>

export type FrameCoalescerParams = {
	/** Reads the live state and pushes it wherever it is shown. */
	flush: () => void
	/** Defers a callback to the next paint; injected so the behaviour is testable. */
	scheduleFrame: (callback: () => void) => void
}

export type StateChange = {
	previous: DocumentState
	current: DocumentState
}

export type DescribeStateChange = (change: StateChange) => EventDraft[]

/** What the playground currently holds, in plain data a store can show. */
export type WorkspaceSnapshot = {
	dialecteId: string | null
	projectName: string | null
	documentId: string | null
	documentName: string | null
	documentState: DocumentState
	canUndo: boolean
	canRedo: boolean
}

export type WorkspaceListener = (snapshot: WorkspaceSnapshot) => void

/** Fired when the stored records changed and any rendered view of them is stale. */
export type DocumentChangeListener = () => void

/** Handed to the script runner: the live objects a script works with. */
export type RunContext = {
	dialecte: LoadedDialecte
	project: Project<AnyDialecteConfig>
	document: Document<AnyDialecteConfig>
	documentId: string
}

export type ExportedXml = {
	xml: string
	filename: string
}
