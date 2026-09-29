import type { ConsoleView, EventLevel, JsonValue } from './event-log.types'

export const CONSOLE_VIEW_LABELS: Record<ConsoleView, string> = {
	all: 'All',
	output: 'Output',
	activity: 'Activity',
	problems: 'Problems',
}

export const LEVEL_GLYPHS: Record<EventLevel, string> = {
	debug: '·',
	info: '›',
	success: '✓',
	warning: '⚠',
	error: '✕',
}

export const LEVEL_TEXT_CLASSES: Record<EventLevel, string> = {
	debug: 'text-gray-400',
	info: 'text-gray-700',
	success: 'text-green-700',
	warning: 'text-yellow-700',
	error: 'text-red-600',
}

export const LEVEL_ROW_CLASSES: Record<EventLevel, string> = {
	debug: '',
	info: '',
	success: '',
	warning: 'bg-yellow-50',
	error: 'bg-red-50',
}

export function formatEventTime(timestamp: number): string {
	const date = new Date(timestamp)
	const time = date.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	})
	const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
	return `${time}.${milliseconds}`
}

export function formatEventData(data: JsonValue): string {
	return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
}
