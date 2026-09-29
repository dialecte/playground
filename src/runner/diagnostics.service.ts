import * as monaco from 'monaco-editor'

import { SCRIPT_MODEL_PATH } from '@/editor/monaco-setup'

import type { ScriptDiagnostic, TranspiledScript } from './runner.types'

type CompilerDiagnostic = Awaited<
	ReturnType<monaco.typescript.TypeScriptWorker['getSemanticDiagnostics']>
>[number]

function flattenMessage(messageText: CompilerDiagnostic['messageText']): string {
	return typeof messageText === 'string' ? messageText : messageText.messageText
}

function toScriptDiagnostic(params: {
	diagnostic: CompilerDiagnostic
	model: monaco.editor.ITextModel | null
}): ScriptDiagnostic {
	const { diagnostic, model } = params
	const lineNumber =
		diagnostic.start !== undefined && model !== null
			? model.getPositionAt(diagnostic.start).lineNumber
			: null

	return { message: flattenMessage(diagnostic.messageText), lineNumber }
}

/**
 * Type-check the script and compile it to JavaScript, both with the editor's own compiler so what
 * runs is exactly what the editor shows as valid. A script with diagnostics is not compiled.
 */
export async function transpileScript(): Promise<TranspiledScript> {
	const scriptUri = monaco.Uri.parse(SCRIPT_MODEL_PATH)
	const scriptPath = scriptUri.toString()

	const getWorker = await monaco.typescript.getTypeScriptWorker()
	const compiler = await getWorker(scriptUri)

	const [syntacticDiagnostics, semanticDiagnostics] = await Promise.all([
		compiler.getSyntacticDiagnostics(scriptPath),
		compiler.getSemanticDiagnostics(scriptPath),
	])

	const model = monaco.editor.getModel(scriptUri)
	const diagnostics = [...syntacticDiagnostics, ...semanticDiagnostics].map((diagnostic) =>
		toScriptDiagnostic({ diagnostic, model }),
	)
	if (diagnostics.length > 0) return { diagnostics, emittedJavaScript: null }

	const emitOutput = await compiler.getEmitOutput(scriptPath)
	const emittedFile = emitOutput.outputFiles.find((outputFile) => outputFile.name.endsWith('.js'))

	return { diagnostics, emittedJavaScript: emittedFile?.text ?? null }
}
