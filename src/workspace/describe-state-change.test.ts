import { computeProgressFraction } from './compute-progress-fraction'
import { describeStateChange } from './describe-state-change'

import { describe, expect, it } from 'vitest'

import type { DialecteError, DocumentState } from '@dialecte/core'

const IDLE: DocumentState = {
	loading: false,
	error: null,
	progress: null,
	history: [],
	lastUpdate: null,
}

const ELEMENT_NOT_FOUND = {
	code: 'D2001',
	key: 'ELEMENT_NOT_FOUND',
	message: 'Element not found',
	detail: 'parent record does not exist in the store',
	method: 'core/src/document/query/query::getRecord',
	ref: { tagName: 'Bay', id: 'bay-1' },
} as DialecteError

describe('computeProgressFraction', () => {
	it.each([
		{
			description: 'no plan',
			progress: { current: 0, total: 0, label: '', step: null },
			expected: 0,
		},
		{
			description: 'completed steps only',
			progress: { current: 1, total: 4, label: '', step: null },
			expected: 0.25,
		},
		{
			description: 'a fine step inside the running coarse step',
			progress: { current: 1, total: 4, label: '', step: { current: 5, total: 10 } },
			expected: 0.375,
		},
		{
			description: 'an empty fine step',
			progress: { current: 2, total: 4, label: '', step: { current: 0, total: 0 } },
			expected: 0.5,
		},
		{
			description: 'an overshooting plan',
			progress: { current: 9, total: 4, label: '', step: null },
			expected: 1,
		},
	])('handles $description', ({ progress, expected }) => {
		expect(computeProgressFraction(progress)).toBe(expected)
	})
})

describe('describeStateChange', () => {
	it('says nothing when nothing changed', () => {
		expect(describeStateChange({ previous: IDLE, current: IDLE })).toEqual([])
	})

	it('reports the start and the end of an operation', () => {
		const busy = { ...IDLE, loading: true }

		expect(describeStateChange({ previous: IDLE, current: busy })).toEqual([
			{ source: 'state', level: 'debug', title: 'Operation started' },
		])
		expect(describeStateChange({ previous: busy, current: IDLE })).toEqual([
			{ source: 'state', level: 'debug', title: 'Operation settled' },
		])
	})

	it('reports progress as one coalescing event carrying both levels', () => {
		const progress = {
			current: 1,
			total: 4,
			label: 'Importing types',
			step: { current: 5, total: 10 },
		}
		const busy = { ...IDLE, loading: true }
		const advancing = { ...busy, progress }

		expect(describeStateChange({ previous: busy, current: advancing })).toEqual([
			{
				source: 'state',
				level: 'info',
				title: 'Importing types 38%',
				detail: 'step 1 / 4, 5 / 10 within it',
				coalesceKey: 'progress',
				data: progress,
			},
		])
	})

	it('falls back to a generic caption for an unlabelled plan', () => {
		const progress = { current: 2, total: 4, label: '', step: null }
		const drafts = describeStateChange({
			previous: { ...IDLE, loading: true },
			current: { ...IDLE, loading: true, progress },
		})

		expect(drafts[0]).toMatchObject({ title: 'Working 50%', detail: 'step 2 / 4' })
	})

	it('does not repeat an unchanged progress frame', () => {
		const progress = { current: 2, total: 4, label: '', step: null }
		const advancing = { ...IDLE, loading: true, progress }

		expect(describeStateChange({ previous: advancing, current: { ...advancing } })).toEqual([])
	})

	it('reports every new history entry', () => {
		const firstCommit = { method: 'commit', message: 'Add bay', timestamp: 10 }
		const secondCommit = {
			method: 'commit',
			message: 'Rename bay',
			timestamp: 20,
			ref: { tagName: 'Bay', id: 'bay-1' },
		}

		const drafts = describeStateChange({
			previous: { ...IDLE, history: [firstCommit] },
			current: { ...IDLE, history: [firstCommit, secondCommit], lastUpdate: 20 },
		})

		expect(drafts).toEqual([
			{
				source: 'history',
				level: 'success',
				title: 'commit',
				detail: 'Rename bay',
				data: { ref: { tagName: 'Bay', id: 'bay-1' } },
			},
		])
	})

	it('reports a new structured error with everything a developer needs', () => {
		const drafts = describeStateChange({
			previous: IDLE,
			current: { ...IDLE, error: ELEMENT_NOT_FOUND },
		})

		expect(drafts).toEqual([
			{
				source: 'problem',
				level: 'error',
				title: 'ELEMENT_NOT_FOUND (D2001)',
				detail: 'parent record does not exist in the store',
				coalesceKey: 'problem::D2001::parent record does not exist in the store',
				data: {
					message: 'Element not found',
					method: 'core/src/document/query/query::getRecord',
					ref: { tagName: 'Bay', id: 'bay-1' },
				},
			},
		])
	})

	it('does not repeat an error that is still set', () => {
		const failed = { ...IDLE, error: ELEMENT_NOT_FOUND }

		expect(describeStateChange({ previous: failed, current: { ...failed } })).toEqual([])
	})
})
