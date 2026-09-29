import { publishEvent } from '@/console/event-sink'
import { serializeConsoleArgument } from '@/console/serialize-console-argument'
import { reportDocumentState } from '@/workspace/workspace.service'

import type { PendingPreview } from './runner.types'
import type { AnyDialecteConfig, Document } from '@dialecte/core'

type PreparedTransaction = Awaited<ReturnType<Document<AnyDialecteConfig>['prepare']>>

/** The staged transaction awaiting a decision. The engine object stays here; stores see plain data. */
let pendingTransaction: PreparedTransaction | null = null

export function holdPreparedTransaction(params: {
	preparedTransaction: PreparedTransaction
	label: string | undefined
}): PendingPreview {
	const { preparedTransaction, label } = params
	const { creates, updates, deletes } = preparedTransaction.summary

	pendingTransaction = preparedTransaction

	publishEvent({
		source: 'preview',
		level: 'info',
		title: `Staged, not committed: ${label ?? 'unlabelled transaction'}`,
		detail: `${creates} created, ${updates} updated, ${deletes} deleted - commit or discard below`,
		data: {
			summary: { creates, updates, deletes },
			operations: serializeConsoleArgument(preparedTransaction.operations),
		},
	})

	return { label: label ?? null, creates, updates, deletes }
}

export async function commitPendingPreview(): Promise<void> {
	if (pendingTransaction === null) return

	const preparedTransaction = pendingTransaction
	pendingTransaction = null
	await preparedTransaction.commit()
	reportDocumentState()
	publishEvent({ source: 'preview', level: 'success', title: 'Staged transaction committed' })
}

export function discardPendingPreview(): void {
	if (pendingTransaction === null) return

	pendingTransaction.discard()
	pendingTransaction = null
	publishEvent({ source: 'preview', level: 'info', title: 'Staged transaction discarded' })
}
