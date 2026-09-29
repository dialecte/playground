import type { JsonValue } from './event-log.types'

const MAXIMUM_DEPTH = 5
const MAXIMUM_ITEMS = 200
const MAXIMUM_MARKUP_LENGTH = 2000

type DomLikeNode = { nodeType: number; nodeName: string; outerHTML?: string }

function isDomLikeNode(value: object): value is DomLikeNode {
	return (
		'nodeType' in value &&
		typeof value.nodeType === 'number' &&
		'nodeName' in value &&
		typeof value.nodeName === 'string'
	)
}

function serializeNumber(value: number): JsonValue {
	if (Number.isNaN(value)) return '[NaN]'
	if (!Number.isFinite(value)) return value > 0 ? '[Infinity]' : '[-Infinity]'
	return value
}

function serializeDomLikeNode(node: DomLikeNode): string {
	const markup = typeof node.outerHTML === 'string' ? node.outerHTML : `<${node.nodeName}>`
	return markup.length > MAXIMUM_MARKUP_LENGTH
		? `${markup.slice(0, MAXIMUM_MARKUP_LENGTH)}…`
		: markup
}

function serializeItems(
	items: unknown[],
	context: { depth: number; ancestors: Set<object> },
): JsonValue[] {
	const keptItems = items.slice(0, MAXIMUM_ITEMS)
	const serialized = keptItems.map((item) => serializeValue(item, context))
	const leftOut = items.length - keptItems.length
	if (leftOut > 0) serialized.push(`[${leftOut} more items]`)
	return serialized
}

function serializeError(
	error: Error,
	context: { depth: number; ancestors: Set<object> },
): JsonValue {
	const serialized: { [key: string]: JsonValue } = { name: error.name, message: error.message }
	if (error.stack !== undefined) serialized.stack = error.stack
	if (error.cause !== undefined) serialized.cause = serializeValue(error.cause, context)
	return serialized
}

function serializeObject(
	value: object,
	context: { depth: number; ancestors: Set<object> },
): JsonValue {
	if (context.ancestors.has(value)) return '[Circular]'
	if (value instanceof Date) return value.toISOString()
	if (isDomLikeNode(value)) return serializeDomLikeNode(value)

	if (context.depth >= MAXIMUM_DEPTH) return Array.isArray(value) ? '[Array]' : '[Object]'

	const childContext = {
		depth: context.depth + 1,
		ancestors: new Set(context.ancestors).add(value),
	}

	if (value instanceof Error) return serializeError(value, childContext)
	if (Array.isArray(value)) return serializeItems(value, childContext)
	if (value instanceof Map) return { '[Map]': serializeItems([...value.entries()], childContext) }
	if (value instanceof Set) return { '[Set]': serializeItems([...value.values()], childContext) }

	const serialized: { [key: string]: JsonValue } = {}
	for (const [key, propertyValue] of Object.entries(value)) {
		serialized[key] = serializeValue(propertyValue, childContext)
	}
	return serialized
}

function serializeValue(
	value: unknown,
	context: { depth: number; ancestors: Set<object> },
): JsonValue {
	if (value === null) return null
	if (value === undefined) return '[undefined]'
	if (typeof value === 'string' || typeof value === 'boolean') return value
	if (typeof value === 'number') return serializeNumber(value)
	if (typeof value === 'bigint') return `${value}n`
	if (typeof value === 'symbol') return value.toString()
	if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
	return serializeObject(value, context)
}

/**
 * Turn anything a script may log into plain JSON at CAPTURE time, so the log never holds a live
 * reference (circular graphs, maps, DOM nodes, XML documents) and stays readable by an agent.
 */
export function serializeConsoleArgument(value: unknown): JsonValue {
	return serializeValue(value, { depth: 0, ancestors: new Set() })
}
