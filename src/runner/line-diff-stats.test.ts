import { computeLineDiffStats } from './line-diff-stats'

import { describe, expect, it } from 'vitest'

describe('computeLineDiffStats', () => {
	it.each([
		{
			description: 'identical documents',
			previous: '<SCL>\n\t<Substation/>\n</SCL>',
			current: '<SCL>\n\t<Substation/>\n</SCL>',
			expected: { addedLineCount: 0, removedLineCount: 0 },
		},
		{
			description: 'added lines',
			previous: '<SCL>\n</SCL>',
			current: '<SCL>\n\t<Substation/>\n\t<Substation/>\n</SCL>',
			expected: { addedLineCount: 2, removedLineCount: 0 },
		},
		{
			description: 'removed lines',
			previous: '<SCL>\n\t<Substation/>\n</SCL>',
			current: '<SCL>\n</SCL>',
			expected: { addedLineCount: 0, removedLineCount: 1 },
		},
		{
			description: 'a changed line, counted as one removal and one addition',
			previous: '<SCL>\n\t<Bay name="Q01"/>\n</SCL>',
			current: '<SCL>\n\t<Bay name="Q02"/>\n</SCL>',
			expected: { addedLineCount: 1, removedLineCount: 1 },
		},
		{
			description: 'an empty starting point',
			previous: '',
			current: '<SCL/>',
			expected: { addedLineCount: 1, removedLineCount: 0 },
		},
	])('counts $description', ({ previous, current, expected }) => {
		expect(computeLineDiffStats({ previous, current })).toEqual(expected)
	})
})
