export type PreparedSource =
	| { isExecutable: true; source: string }
	| { isExecutable: false; reason: string }

export type LineDiffStats = {
	addedLineCount: number
	removedLineCount: number
}

export type ScriptDiagnostic = {
	message: string
	lineNumber: number | null
}

export type TranspiledScript = {
	diagnostics: ScriptDiagnostic[]
	/** Absent when the diagnostics forbid running. */
	emittedJavaScript: string | null
}

export type ConsoleMethodName = 'log' | 'info' | 'warn' | 'error' | 'debug'

/** Names and values a script finds in scope, in a stable order. */
export type ScriptGlobals = Record<string, unknown>

export type ExecuteScriptParams = {
	source: string
	globals: ScriptGlobals
}

export type RunStatus = 'idle' | 'checking' | 'running'

export type RunSummary = {
	durationInMilliseconds: number
	commitCount: number
	diffStats: LineDiffStats
}

/** The part of a document the preview stand-in relies on. */
export type PreviewableDocument = {
	// The callback is handed over untouched, so its exact shape is the document's own business.
	prepare(callback: never, options?: { label?: string }): Promise<unknown>
}

export type PreparedTransactionOf<GenericDocument extends PreviewableDocument> = Awaited<
	ReturnType<GenericDocument['prepare']>
>

export type PreviewDocumentParams<GenericDocument extends PreviewableDocument> = {
	document: GenericDocument
	onPrepared: (
		preparedTransaction: PreparedTransactionOf<GenericDocument>,
		label: string | undefined,
	) => void
}

/** What a run produced: how long it took, and the transaction it staged when previewing. */
export type RunOutcome = {
	durationInMilliseconds: number
	pendingPreview: PendingPreview | null
}

/** What a staged transaction would do, in plain data the console can show. */
export type PendingPreview = {
	label: string | null
	creates: number
	updates: number
	deletes: number
}
