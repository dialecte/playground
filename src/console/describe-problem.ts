import type { EventDraft, JsonValue } from './event-log.types'
import type { DialecteError } from '@dialecte/core'

function isStructuredError(value: unknown): value is DialecteError {
	return (
		typeof value === 'object' &&
		value !== null &&
		'code' in value &&
		typeof value.code === 'string' &&
		'key' in value &&
		typeof value.key === 'string' &&
		'detail' in value &&
		typeof value.detail === 'string'
	)
}

/**
 * The same failure can be reported twice: once by the document whose state recorded it, once by
 * whoever caught it. The shared key lets the log keep a single row for both.
 */
export function describeStructuredError(error: DialecteError): EventDraft {
	const data: { [key: string]: JsonValue } = { message: error.message, method: error.method }
	if (error.ref !== undefined) data.ref = error.ref

	return {
		source: 'problem',
		level: 'error',
		title: `${error.key} (${error.code})`,
		detail: error.detail,
		coalesceKey: `problem::${error.code}::${error.detail}`,
		data,
	}
}

function describeOrdinaryError(error: Error): EventDraft {
	const data: { [key: string]: JsonValue } = { name: error.name }
	if (error.stack !== undefined) data.stack = error.stack

	return { source: 'problem', level: 'error', title: `${error.name}: ${error.message}`, data }
}

function describeThrownValue(thrown: unknown): EventDraft {
	const title =
		typeof thrown === 'object' && thrown !== null ? JSON.stringify(thrown) : String(thrown)
	return { source: 'problem', level: 'error', title }
}

const MAXIMUM_CAUSE_DEPTH = 10

function readCause(value: unknown): unknown {
	return typeof value === 'object' && value !== null && 'cause' in value ? value.cause : undefined
}

/**
 * Walk the chain of causes and keep the DEEPEST structured error. A transaction reports whatever
 * its callback threw under a generic key, with the original failure as its cause: the original one
 * is what names the problem.
 */
function findRootStructuredError(thrown: unknown): DialecteError | null {
	let rootStructuredError: DialecteError | null = null
	let current: unknown = thrown

	for (let depth = 0; depth < MAXIMUM_CAUSE_DEPTH && current !== undefined; depth += 1) {
		if (isStructuredError(current)) rootStructuredError = current
		current = readCause(current)
	}
	return rootStructuredError
}

/**
 * Anything can be thrown. The engine throws a structured error either bare or as the cause of a
 * real `Error`; a script throws whatever it likes.
 */
export function describeProblem(thrown: unknown): EventDraft {
	const rootStructuredError = findRootStructuredError(thrown)
	if (rootStructuredError !== null) return describeStructuredError(rootStructuredError)

	if (thrown instanceof Error) return describeOrdinaryError(thrown)
	return describeThrownValue(thrown)
}
