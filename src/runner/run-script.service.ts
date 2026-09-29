import { executeScript } from './execute-script.service'
import { PreviewHalt, createPreviewDocument } from './preview-document'
import { holdPreparedTransaction } from './preview.service'

import * as coreHelpers from '@dialecte/core/helpers'
import * as coreUtils from '@dialecte/core/utils'

import { publishEvent } from '@/console/event-sink'

import type { PendingPreview, RunOutcome, ScriptGlobals } from './runner.types'
import type { JsonValue } from '@/console/event-log.types'
import type { RunContext } from '@/workspace/workspace.types'

function buildScriptGlobals(params: { context: RunContext; document: unknown }): ScriptGlobals {
	const { context, document } = params
	return {
		project: context.project,
		doc: document,
		documentId: context.documentId,
		dialecte: context.dialecte.moduleNamespace,
		helpers: coreHelpers,
		utils: coreUtils,
	}
}

/**
 * Timings exist only for a project created with its dev perf switch on, which is the dialecte's
 * own choice. When it is off the report is empty and nothing is said.
 */
function publishPerfReport(context: RunContext): void {
	const report = context.project.perf.report()
	const measuredNames = Object.keys(report)
	if (measuredNames.length === 0) return

	publishEvent({
		source: 'perf',
		level: 'info',
		title: `Perf report (${measuredNames.length} measures)`,
		data: report as unknown as JsonValue,
	})
}

/**
 * Run a prepared script against the loaded file. When previewing, the script sees a stand-in
 * document that stages its first transaction and stops there.
 */
export async function runScript(params: {
	source: string
	context: RunContext
	isPreview: boolean
}): Promise<RunOutcome> {
	const { source, context, isPreview } = params

	let pendingPreview: PendingPreview | null = null
	const document = isPreview
		? createPreviewDocument({
				document: context.document,
				onPrepared(preparedTransaction, label) {
					pendingPreview = holdPreparedTransaction({ preparedTransaction, label })
				},
			})
		: context.document

	context.project.perf.reset()
	const startedAt = performance.now()
	try {
		await executeScript({ source, globals: buildScriptGlobals({ context, document }) })
	} catch (thrown) {
		if (!(thrown instanceof PreviewHalt)) throw thrown
	} finally {
		publishPerfReport(context)
	}

	return { durationInMilliseconds: Math.round(performance.now() - startedAt), pendingPreview }
}
