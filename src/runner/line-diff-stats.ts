import type { LineDiffStats } from './runner.types'

function countLines(text: string): Map<string, number> {
	const lineCounts = new Map<string, number>()
	if (text === '') return lineCounts

	for (const line of text.split('\n')) {
		lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1)
	}
	return lineCounts
}

/**
 * How much two serialized documents differ, as line counts. Lines are compared as a multiset, not
 * aligned: enough for a run summary, and linear on documents of any size.
 */
export function computeLineDiffStats(params: { previous: string; current: string }): LineDiffStats {
	const previousLineCounts = countLines(params.previous)
	const currentLineCounts = countLines(params.current)

	let addedLineCount = 0
	let removedLineCount = 0

	for (const [line, currentCount] of currentLineCounts) {
		const previousCount = previousLineCounts.get(line) ?? 0
		if (currentCount > previousCount) addedLineCount += currentCount - previousCount
	}
	for (const [line, previousCount] of previousLineCounts) {
		const currentCount = currentLineCounts.get(line) ?? 0
		if (previousCount > currentCount) removedLineCount += previousCount - currentCount
	}

	return { addedLineCount, removedLineCount }
}
