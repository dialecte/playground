import * as CoreHelpers from '@dialecte/core/helpers'
import * as CoreUtils from '@dialecte/core/utils'
import { openSclDocument, importSclFiles, exportSclFile } from '@dialecte/scl/v2019C1'
import { useStorage } from '@vueuse/core'
import { useFileDialog } from '@vueuse/core'
import * as monaco from 'monaco-editor'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import xmlFormat from 'xml-formatter'

import type { DocumentState } from '@dialecte/core'

type SclDocument = ReturnType<typeof openSclDocument>

const DEFAULT_DATABASE_NAME = 'playground'

function defaultCode() {
	return `// Write your Dialecte code here
// Globals available:
//   openSclDocument, importSclFiles, exportSclFile — SCL document API
//   DATABASE_NAME — name of the current IndexedDB database
//   helpers — type guards (isRawRecord, isTrackedRecord, isRecordOf, …)
//             and converters (toRawRecord, toTrackedRecord, toRef, standardizeRecord, …)
//   utils   — assert(condition, message)
// After each run, the XML output updates automatically.

const document = openSclDocument({ type: 'local', databaseName: DATABASE_NAME })

await document.transaction(async (tx) => {
	const root = await tx.getRoot()
	const sub = await tx.findChildren(root, { tagName: 'Substation' })
	if (sub.length > 0) {
		await tx.addChild(sub[0], { tagName: 'VoltageLevel', attributes: { name: 'VL1' } })
	}
})
`
}

export type ConsoleEntry = {
	type: 'log' | 'warn' | 'error' | 'info'
	args: unknown[]
	timestamp: number
}

export const usePlaygroundStore = defineStore('playground', () => {
	// ====== STATE ======
	const databaseName = useStorage('playground-db-name', DEFAULT_DATABASE_NAME)
	const code = useStorage('playground-code', defaultCode())
	const isRunning = ref(false)
	const error = ref<string | null>(null)
	const consoleEntries = ref<ConsoleEntry[]>([])

	const { open: openNewFile, onChange } = useFileDialog({
		accept: '.fsd, .asd, .xml, .scd, .ssd',
		multiple: false,
	})

	onChange(async (files) => {
		const filesArray = Array.from(files || [])
		if (!filesArray.length) return

		const file = filesArray[0]
		if (file) await importFile(file)
	})

	/** XML string history — index 0 is current, higher indices are older */
	const currentXmlString = ref('')
	const previousXmlString = ref('')

	const canUndo = ref(false)
	const canRedo = ref(false)

	/** The active Document instance (created on init or import) */
	let sclDocument: SclDocument | null = null

	/** Reactive mirror of doc.state — Vue tracks all field mutations automatically */
	const documentState = reactive<DocumentState>({
		loading: false,
		error: null,
		activity: null,
		progress: null,
		history: [],
		lastUpdate: null,
	})

	// ====== INTERNAL HELPERS ======

	/** Export current DB state to an XML string */
	async function dbToXml(): Promise<string> {
		const { xmlDocument } = await exportSclFile({
			databaseName: databaseName.value,
			extension: '.scd',
			withDatabaseIds: true,
		})
		const serializer = new XMLSerializer()
		const raw = serializer.serializeToString(xmlDocument)
		return xmlFormat('<?xml version="1.0" encoding="UTF-8"?>\n' + raw, {
			indentation: '\t',
			collapseContent: true,
			lineSeparator: '\n',
		})
	}

	/** Refresh the XML output from the current DB state */
	async function refreshXml() {
		const oldXml = currentXmlString.value
		const xml = await dbToXml()
		previousXmlString.value = oldXml
		currentXmlString.value = xml
	}

	/** Open (or reopen) the SCL document for the current database */
	function ensureDocument(): SclDocument {
		if (!sclDocument) {
			sclDocument = openSclDocument({ type: 'local', databaseName: databaseName.value })
			// Swap documentState fields to point at doc.state
			// Object.assign keeps the same reactive proxy, just replaces contents
			Object.assign(documentState, sclDocument.state)
			// Now make documentState the live state object Document mutates
			;(sclDocument as unknown as { state: DocumentState }).state = documentState
		}
		return sclDocument
	}

	// ====== ACTIONS ======

	/** Get TypeScript diagnostics from Monaco's TS worker */
	async function getTypescriptDiagnostics(): Promise<string[]> {
		const uri = monaco.Uri.parse('file:///playground.ts')
		const worker = await monaco.languages.typescript.getTypeScriptWorker()
		const client = await worker(uri)
		const [syntactic, semantic] = await Promise.all([
			client.getSyntacticDiagnostics(uri.toString()),
			client.getSemanticDiagnostics(uri.toString()),
		])
		return [...syntactic, ...semantic].map((d) => {
			const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText
			if (d.start !== undefined) {
				const model = monaco.editor.getModel(uri)
				if (model) {
					const pos = model.getPositionAt(d.start)
					return `Line ${pos.lineNumber}: ${msg}`
				}
			}
			return msg
		})
	}

	/** Run user code, then snapshot the resulting DB state */
	async function run() {
		isRunning.value = true
		error.value = null
		consoleEntries.value = []

		// Check for TypeScript errors before executing
		try {
			const diagnostics = await getTypescriptDiagnostics()
			if (diagnostics.length > 0) {
				error.value = `${diagnostics.length} TypeScript error(s) — fix before running`
				for (const msg of diagnostics) {
					consoleEntries.value.push({ type: 'error', args: [msg], timestamp: Date.now() })
				}
				isRunning.value = false
				return
			}
		} catch {
			// If diagnostics fail, proceed anyway
		}

		// Intercept console methods during execution
		const origLog = console.log
		const origWarn = console.warn
		const origError = console.error
		const origInfo = console.info

		function capture(type: ConsoleEntry['type']) {
			return (...args: unknown[]) => {
				consoleEntries.value.push({ type, args, timestamp: Date.now() })
				// Still output to real console
				if (type === 'log') origLog(...args)
				else if (type === 'warn') origWarn(...args)
				else if (type === 'error') origError(...args)
				else origInfo(...args)
			}
		}

		console.log = capture('log')
		console.warn = capture('warn')
		console.error = capture('error')
		console.info = capture('info')

		try {
			const asyncFn = new Function(
				'openSclDocument',
				'importSclFiles',
				'exportSclFile',
				'helpers',
				'utils',
				'DATABASE_NAME',
				`return (async () => {\n${code.value}\n})()`,
			)

			await asyncFn(
				openSclDocument,
				importSclFiles,
				exportSclFile,
				CoreHelpers,
				CoreUtils,
				databaseName.value,
			)

			// Re-create document in case user code destroyed/recreated the DB
			sclDocument = null
			Object.assign(documentState, {
				loading: false,
				error: null,
				activity: null,
				progress: null,
				history: [],
				lastUpdate: null,
			})
			await refreshXml()
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e)
			error.value = msg
			consoleEntries.value.push({ type: 'error', args: [msg], timestamp: Date.now() })
		} finally {
			console.log = origLog
			console.warn = origWarn
			console.error = origError
			console.info = origInfo
			isRunning.value = false
		}
	}

	/** Load a file from disk as starting point */
	async function importFile(file: File) {
		error.value = null
		try {
			// Delete previous DB if it exists
			if (sclDocument) {
				await sclDocument.destroy()
				sclDocument = null
			}

			// Rename to playground.scd so the DB is always called "playground"
			const renamedFile = new File([file], 'playground.scd', { type: file.type })
			await importSclFiles({ files: [renamedFile] })
			databaseName.value = DEFAULT_DATABASE_NAME

			await refreshXml()
			// No diff on fresh import
			previousXmlString.value = currentXmlString.value
		} catch (e) {
			error.value = e instanceof Error ? e.message : String(e)
		}
	}

	/** Download current state as .scd file */
	async function exportFile() {
		error.value = null
		try {
			await exportSclFile({
				databaseName: databaseName.value,
				extension: '.scd',
				withDownload: true,
			})
		} catch (e) {
			error.value = e instanceof Error ? e.message : String(e)
		}
	}

	/** Undo — delegate to Document store changelog */
	async function undo() {
		const doc = ensureDocument()
		await doc.undo()
		await refreshXml()
	}

	/** Redo — delegate to Document store changelog */
	async function redo() {
		const doc = ensureDocument()
		await doc.redo()
		await refreshXml()
	}

	/** Reset everything */
	async function resetPlayground() {
		try {
			if (sclDocument) {
				await sclDocument.destroy()
				sclDocument = null
			}
		} catch {
			// ignore
		}
		databaseName.value = DEFAULT_DATABASE_NAME
		code.value = defaultCode()
		currentXmlString.value = ''
		previousXmlString.value = ''
		canUndo.value = false
		canRedo.value = false
		error.value = null

		// Clear localStorage keys so useStorage picks up defaults on next load
		localStorage.removeItem('playground-db-name')
		localStorage.removeItem('playground-code')
	}
	/** Try to load the existing DB content on page load */
	async function init() {
		try {
			const xml = await dbToXml()
			if (xml && xml.length > 80) {
				currentXmlString.value = xml
				previousXmlString.value = xml
			}
		} catch {
			// DB doesn't exist or is empty — nothing to restore
		}
	}
	return {
		databaseName,
		code,
		isRunning,
		error,
		consoleEntries,
		currentXmlString,
		previousXmlString,
		canUndo,
		canRedo,
		documentState,
		run,
		openNewFile,
		init,
		importFile,
		exportFile,
		undo,
		redo,
		resetPlayground,
	}
})
