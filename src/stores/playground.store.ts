import { createSclDialecte, importSclFiles, exportSclFile } from '@dialecte/scl/v2019C1'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import xmlFormat from 'xml-formatter'
import * as monaco from 'monaco-editor'
import { useFileDialog } from '@vueuse/core'

const DEFAULT_DATABASE_NAME = 'playground'

function defaultCode() {
	return `// Write your Dialecte code here
// The dialecte functions are available as globals.
// DATABASE_NAME always points to the current database.
// After each run, the XML output updates automatically.

const dialecte = createSclDialecte({ databaseName: DATABASE_NAME })

await dialecte
	.fromRoot()
	.goToElement({ tagName: 'Substation' })
	.addChild({ tagName: 'VoltageLevel', attributes: { name: 'VL1' } })
	.commit()
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
	const xmlHistory = ref<string[]>([])
	const historyIndex = ref(0)

	// ====== COMPUTED ======
	const currentXmlString = computed(() => xmlHistory.value[historyIndex.value] ?? '')
	const previousXmlString = computed(() => {
		const prevIdx = historyIndex.value + 1
		if (prevIdx >= xmlHistory.value.length) return currentXmlString.value
		return xmlHistory.value[prevIdx]
	})

	const canUndo = computed(() => historyIndex.value < xmlHistory.value.length - 1)
	const canRedo = computed(() => historyIndex.value > 0)

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

	/** Replace DB contents with an XML string */
	async function xmlToDb(xml: string) {
		const dialecte = createSclDialecte({ databaseName: databaseName.value })
		dialecte.getDatabaseInstance().delete()

		const file = new File([xml], `${databaseName.value}.scd`, { type: 'application/xml' })
		await importSclFiles({ files: [file] })
	}

	/** Push a new XML snapshot into history (discards any redo-able future) */
	function pushSnapshot(xml: string) {
		if (historyIndex.value > 0) {
			xmlHistory.value = xmlHistory.value.slice(historyIndex.value)
			historyIndex.value = 0
		}
		xmlHistory.value.unshift(xml)
		if (xmlHistory.value.length > 50) xmlHistory.value.length = 50
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
				'createSclDialecte',
				'importSclFiles',
				'exportSclFile',
				'DATABASE_NAME',
				`return (async () => {\n${code.value}\n})()`,
			)

			await asyncFn(createSclDialecte, importSclFiles, exportSclFile, databaseName.value)

			const xml = await dbToXml()
			pushSnapshot(xml)
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
			const oldDialecte = createSclDialecte({ databaseName: databaseName.value })
			oldDialecte.getDatabaseInstance().delete()

			// Rename to playground.scd so the DB is always called "playground"
			const renamedFile = new File([file], 'playground.scd', { type: file.type })
			await importSclFiles({ files: [renamedFile] })
			databaseName.value = DEFAULT_DATABASE_NAME

			const xml = await dbToXml()
			xmlHistory.value = [xml]
			historyIndex.value = 0
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

	/** Undo — move back in history & restore DB to that state */
	async function undo() {
		if (!canUndo.value) return
		historyIndex.value++
		await xmlToDb(currentXmlString.value)
	}

	/** Redo — move forward in history & restore DB to that state */
	async function redo() {
		if (!canRedo.value) return
		historyIndex.value--
		await xmlToDb(currentXmlString.value)
	}

	/** Reset everything */
	async function resetPlayground() {
		try {
			const dialecte = createSclDialecte({ databaseName: databaseName.value })
			await dialecte.getDatabaseInstance().delete()
		} catch {
			// ignore
		}
		databaseName.value = DEFAULT_DATABASE_NAME
		code.value = defaultCode()
		xmlHistory.value = []
		historyIndex.value = 0
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
				xmlHistory.value = [xml]
				historyIndex.value = 0
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
