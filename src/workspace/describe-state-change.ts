import { computeProgressFraction } from './compute-progress-fraction'

import { describeProblem } from '@/console/describe-problem'

import type { DocumentProgress, StateChange } from './workspace.types'
import type { EventDraft } from '@/console/event-log.types'
import type { DocumentState } from '@dialecte/core'

type HistoryEntry = DocumentState['history'][number]

function isSameProgress(previous: DocumentState['progress'], current: DocumentProgress): boolean {
	return (
		previous !== null &&
		previous.current === current.current &&
		previous.total === current.total &&
		previous.label === current.label &&
		previous.step?.current === current.step?.current &&
		previous.step?.total === current.step?.total
	)
}

function describeProgress(progress: DocumentProgress): EventDraft {
	const percentage = Math.round(computeProgressFraction(progress) * 100)
	const caption = progress.label === '' ? 'Working' : progress.label
	const coarseStep = `step ${progress.current} / ${progress.total}`
	const detail =
		progress.step === null
			? coarseStep
			: `${coarseStep}, ${progress.step.current} / ${progress.step.total} within it`

	return {
		source: 'state',
		level: 'info',
		title: `${caption} ${percentage}%`,
		detail,
		coalesceKey: 'progress',
		data: progress,
	}
}

function describeHistoryEntry(entry: HistoryEntry): EventDraft {
	const draft: EventDraft = {
		source: 'history',
		level: 'success',
		title: entry.method,
		detail: entry.message,
	}
	if (entry.ref !== undefined) draft.data = { ref: entry.ref }
	return draft
}

/**
 * A document's state is plain data that changes silently. Comparing two snapshots of it tells
 * what happened in between, as console events: an operation starting or settling, progress,
 * committed transactions, a structured error.
 */
export function describeStateChange(change: StateChange): EventDraft[] {
	const { previous, current } = change
	const drafts: EventDraft[] = []

	if (!previous.loading && current.loading) {
		drafts.push({ source: 'state', level: 'debug', title: 'Operation started' })
	}

	if (current.progress !== null && !isSameProgress(previous.progress, current.progress)) {
		drafts.push(describeProgress(current.progress))
	}

	const newHistoryEntries = current.history.slice(previous.history.length)
	for (const entry of newHistoryEntries) drafts.push(describeHistoryEntry(entry))

	if (current.error !== null && current.error !== previous.error) {
		drafts.push(describeProblem(current.error))
	}

	if (previous.loading && !current.loading) {
		drafts.push({ source: 'state', level: 'debug', title: 'Operation settled' })
	}

	return drafts
}
