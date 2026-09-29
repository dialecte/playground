import { createFrameCoalescer } from './create-frame-coalescer'
import { describeStateChange } from './describe-state-change'

import { formatXml } from '@dialecte/core/utils'

import { publishEvent } from '@/console/event-sink'

import type {
	DocumentChangeListener,
	ExportedXml,
	RunContext,
	WorkspaceListener,
	WorkspaceSnapshot,
} from './workspace.types'
import type { JsonValue } from '@/console/event-log.types'
import type { LoadedDialecte } from '@/dialecte-registry/dialecte-registry.types'
import type {
	AnyDialecteConfig,
	Document,
	DocumentState,
	Project,
	ProjectChannelMessage,
} from '@dialecte/core'

const IDLE_DOCUMENT_STATE: DocumentState = {
	loading: false,
	error: null,
	progress: null,
	history: [],
	lastUpdate: null,
}

//====== SINGLETON ======//

let activeDialecte: LoadedDialecte | null = null
let activeProject: Project<AnyDialecteConfig> | null = null
let activeDocument: Document<AnyDialecteConfig> | null = null
let activeDocumentId: string | null = null
let activeDocumentName: string | null = null
let activeChannel: BroadcastChannel | null = null
let unsubscribeFromDocument: (() => void) | null = null
let lastDescribedState: DocumentState = IDLE_DOCUMENT_STATE

const workspaceListeners = new Set<WorkspaceListener>()
const documentChangeListeners = new Set<DocumentChangeListener>()

//====== SNAPSHOT ======//

function cloneDocumentState(state: DocumentState): DocumentState {
	return {
		loading: state.loading,
		error: state.error,
		progress:
			state.progress === null
				? null
				: {
						...state.progress,
						step: state.progress.step === null ? null : { ...state.progress.step },
					},
		history: [...state.history],
		lastUpdate: state.lastUpdate,
	}
}

export function readWorkspaceSnapshot(): WorkspaceSnapshot {
	const documentEntry =
		activeProject !== null && activeDocumentId !== null
			? activeProject.state.documents.get(activeDocumentId)
			: undefined

	return {
		dialecteId: activeDialecte?.id ?? null,
		projectName: activeProject === null ? null : activeProject.name,
		documentId: activeDocumentId,
		documentName: activeDocumentName,
		documentState: cloneDocumentState(activeDocument?.state ?? IDLE_DOCUMENT_STATE),
		canUndo: documentEntry?.canUndo ?? false,
		canRedo: documentEntry?.canRedo ?? false,
	}
}

function notifyWorkspaceListeners(): void {
	const snapshot = readWorkspaceSnapshot()
	for (const listener of workspaceListeners) listener(snapshot)
}

function notifyDocumentChangeListeners(): void {
	for (const listener of documentChangeListeners) listener()
}

export function subscribeToWorkspace(listener: WorkspaceListener): () => void {
	workspaceListeners.add(listener)
	return function unsubscribe(): void {
		workspaceListeners.delete(listener)
	}
}

export function subscribeToDocumentChanges(listener: DocumentChangeListener): () => void {
	documentChangeListeners.add(listener)
	return function unsubscribe(): void {
		documentChangeListeners.delete(listener)
	}
}

//====== OBSERVATION ======//

function scheduleFrame(callback: () => void): void {
	requestAnimationFrame(callback)
}

function flushDocumentState(): void {
	if (activeDocument === null) return

	const currentState = cloneDocumentState(activeDocument.state)
	const drafts = describeStateChange({ previous: lastDescribedState, current: currentState })
	lastDescribedState = currentState

	for (const draft of drafts) publishEvent(draft)
	notifyWorkspaceListeners()
}

/**
 * Read the document's state now. Needed after an operation that changes it without signalling
 * its subscribers, as committing a prepared transaction does.
 */
export function reportDocumentState(): void {
	flushDocumentState()
}

function describeChannelMessage(message: ProjectChannelMessage): string {
	if ('documentId' in message) return `document ${message.documentId}`
	return `blob ${message.blobId}`
}

function handleChannelMessage(event: MessageEvent<ProjectChannelMessage>): void {
	const message = event.data

	publishEvent({
		source: 'channel',
		level: 'debug',
		title: message.type,
		detail: describeChannelMessage(message),
		data: message as unknown as JsonValue,
	})

	const touchesActiveDocument = 'documentId' in message && message.documentId === activeDocumentId
	if (message.type === 'commit' && touchesActiveDocument) notifyDocumentChangeListeners()

	notifyWorkspaceListeners()
}

function observeDocument(document: Document<AnyDialecteConfig>): void {
	unsubscribeFromDocument?.()
	lastDescribedState = cloneDocumentState(document.state)
	unsubscribeFromDocument = document.subscribe(
		createFrameCoalescer({ flush: flushDocumentState, scheduleFrame }),
	)
}

function releaseDocument(): void {
	unsubscribeFromDocument?.()
	unsubscribeFromDocument = null
	activeDocument = null
	activeDocumentId = null
	activeDocumentName = null
	lastDescribedState = IDLE_DOCUMENT_STATE
}

function requireProject(): Project<AnyDialecteConfig> {
	if (activeProject === null) throw new Error('No project is open yet.')
	return activeProject
}

function requireDocumentId(): string {
	if (activeDocumentId === null) throw new Error('No file is loaded yet. Open a file first.')
	return activeDocumentId
}

//====== LIFECYCLE ======//

function buildProjectName(dialecte: LoadedDialecte): string {
	return `playground::${dialecte.id}`
}

function attachDocument(params: { documentId: string; documentName: string }): void {
	const project = requireProject()
	const document = project.openDocument(params.documentId)

	activeDocument = document
	activeDocumentId = params.documentId
	activeDocumentName = params.documentName
	observeDocument(document)
}

/** Open the project of a dialecte and pick up the file it already holds, if any. */
export async function openWorkspace(params: { dialecte: LoadedDialecte }): Promise<void> {
	const { dialecte } = params
	closeWorkspace()

	const projectName = buildProjectName(dialecte)
	const project = dialecte.createProject({ storage: { type: 'local' } })
	await project.open(projectName)

	activeDialecte = dialecte
	activeProject = project
	activeChannel = project.createChannel()
	activeChannel.addEventListener('message', handleChannelMessage)

	publishEvent({
		source: 'lifecycle',
		level: 'success',
		title: `Project ${projectName} opened`,
		detail: `${dialecte.label} (${dialecte.source})`,
		data: { channel: project.channelName },
	})

	const storedDocuments = await project.getDocuments()
	const restoredDocument = storedDocuments.at(-1)
	if (restoredDocument !== undefined) {
		attachDocument({
			documentId: restoredDocument.id,
			documentName: `${restoredDocument.name}${restoredDocument.extension}`,
		})
		publishEvent({
			source: 'lifecycle',
			level: 'info',
			title: `Restored ${restoredDocument.name}${restoredDocument.extension}`,
			detail: 'found in the browser database',
		})
	}

	notifyWorkspaceListeners()
	notifyDocumentChangeListeners()
}

export function closeWorkspace(): void {
	if (activeProject === null) return

	const projectName = activeProject.name
	releaseDocument()
	activeChannel?.removeEventListener('message', handleChannelMessage)
	activeChannel?.close()
	activeChannel = null
	activeProject.close()
	activeProject = null

	publishEvent({ source: 'lifecycle', level: 'info', title: `Project ${projectName} closed` })
	notifyWorkspaceListeners()
}

/** Delete the browser database of the active dialecte and start again from an empty project. */
export async function resetWorkspace(): Promise<void> {
	const project = requireProject()
	const dialecte = activeDialecte
	const projectName = project.name

	releaseDocument()
	activeChannel?.removeEventListener('message', handleChannelMessage)
	activeChannel?.close()
	activeChannel = null
	await project.destroy()
	activeProject = null

	publishEvent({ source: 'lifecycle', level: 'warning', title: `Project ${projectName} destroyed` })

	if (dialecte !== null) await openWorkspace({ dialecte })
}

//====== IO ======//

/** The playground works on one file at a time: a new file replaces the loaded one. */
export async function importFile(params: { file: File }): Promise<void> {
	const { file } = params
	const project = requireProject()

	const previousDocuments = await project.getDocuments()
	releaseDocument()
	for (const previousDocument of previousDocuments) {
		await project.removeDocument(previousDocument.id)
	}

	publishEvent({
		source: 'io',
		level: 'info',
		title: `Importing ${file.name}`,
		detail: `${file.size.toLocaleString()} bytes`,
	})

	const startedAt = performance.now()
	const importResults = await project.import([file])
	const durationInMilliseconds = Math.round(performance.now() - startedAt)

	const importResult = importResults[0]
	if (importResult === undefined) throw new Error(`${file.name} produced no document.`)

	attachDocument({ documentId: importResult.documentId, documentName: file.name })

	publishEvent({
		source: 'io',
		level: 'success',
		title: `Imported ${file.name}`,
		detail: `${importResult.recordCount.toLocaleString()} records in ${durationInMilliseconds} ms`,
		data: {
			documentId: importResult.documentId,
			recordCount: importResult.recordCount,
			durationInMilliseconds,
		},
	})

	notifyWorkspaceListeners()
	notifyDocumentChangeListeners()
}

/** Serialize the loaded file, with database identifiers so a diff shows which record moved. */
export async function exportXml(): Promise<ExportedXml | null> {
	if (activeProject === null || activeDocumentId === null) return null

	const exported = await activeProject.export(activeDocumentId, { withDatabaseIds: true })
	const serialized = new XMLSerializer().serializeToString(exported.xmlDocument)

	return { xml: formatXml(serialized, { indent: '\t' }), filename: exported.filename }
}

export async function downloadFile(): Promise<void> {
	const project = requireProject()
	const documentId = requireDocumentId()

	const exported = await project.export(documentId, { withDownload: true })
	publishEvent({ source: 'io', level: 'success', title: `Exported ${exported.filename}` })
}

//====== HISTORY ======//

// The engine records only commits in a document's history, and announces an undo or a redo on the
// channel as a plain commit. Naming them is therefore done here, where they are requested; the
// channel message that follows refreshes any rendered view of the records.

export async function undo(): Promise<void> {
	const project = requireProject()
	const documentId = requireDocumentId()

	await project.undo(documentId)
	publishEvent({ source: 'history', level: 'info', title: 'undo' })
	notifyWorkspaceListeners()
}

export async function redo(): Promise<void> {
	const project = requireProject()
	const documentId = requireDocumentId()

	await project.redo(documentId)
	publishEvent({ source: 'history', level: 'info', title: 'redo' })
	notifyWorkspaceListeners()
}

//====== RUNNER ACCESS ======//

export function readRunContext(): RunContext | null {
	if (
		activeDialecte === null ||
		activeProject === null ||
		activeDocument === null ||
		activeDocumentId === null
	) {
		return null
	}

	return {
		dialecte: activeDialecte,
		project: activeProject,
		document: activeDocument,
		documentId: activeDocumentId,
	}
}
