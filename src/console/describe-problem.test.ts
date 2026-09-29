import { describeProblem } from './describe-problem'

import { describe, expect, it } from 'vitest'

const STRUCTURED_ERROR = {
	code: 'D3001',
	key: 'INVALID_PARENT_CHILD',
	message: 'This element cannot be added here',
	detail: 'Bay does not accept a Substation child',
	method: 'core/src/document/transaction/transaction::addChild',
	ref: { tagName: 'Bay', id: 'bay-1' },
}

const STRUCTURED_DRAFT = {
	source: 'problem',
	level: 'error',
	title: 'INVALID_PARENT_CHILD (D3001)',
	detail: 'Bay does not accept a Substation child',
	coalesceKey: 'problem::D3001::Bay does not accept a Substation child',
	data: {
		message: 'This element cannot be added here',
		method: 'core/src/document/transaction/transaction::addChild',
		ref: { tagName: 'Bay', id: 'bay-1' },
	},
}

describe('describeProblem', () => {
	it('unwraps a structured error carried as the cause of a thrown error', () => {
		const thrown = new Error('This element cannot be added here', { cause: STRUCTURED_ERROR })

		expect(describeProblem(thrown)).toEqual(STRUCTURED_DRAFT)
	})

	it('accepts a structured error thrown bare', () => {
		expect(describeProblem(STRUCTURED_ERROR)).toEqual(STRUCTURED_DRAFT)
	})

	it('shows the original structured error when a generic wrapper hides it', () => {
		const original = new Error('This element cannot be added here', { cause: STRUCTURED_ERROR })
		const wrapper = {
			code: 'D0001',
			key: 'UNKNOWN',
			message: 'Unknown error',
			detail: 'This element cannot be added here',
			method: 'core/src/document/document::transaction',
			cause: original,
		}
		const thrown = new Error('Unknown error', { cause: wrapper })

		expect(describeProblem(thrown)).toEqual(STRUCTURED_DRAFT)
	})

	it('keeps a generic wrapper that hides nothing structured', () => {
		const wrapper = {
			code: 'D0001',
			key: 'UNKNOWN',
			message: 'Unknown error',
			detail: 'root is undefined',
			method: 'core/src/document/document::transaction',
			cause: new TypeError('root is undefined'),
		}

		expect(describeProblem(wrapper)).toMatchObject({ title: 'UNKNOWN (D0001)' })
	})

	it('omits the element reference when the error has none', () => {
		const { ref: _unused, ...withoutReference } = STRUCTURED_ERROR
		const draft = describeProblem(withoutReference)

		expect(draft.data).toEqual({
			message: 'This element cannot be added here',
			method: 'core/src/document/transaction/transaction::addChild',
		})
	})

	it('keeps the name and the stack of an ordinary error', () => {
		const thrown = new TypeError('root is undefined')
		const draft = describeProblem(thrown)

		expect(draft).toMatchObject({
			source: 'problem',
			level: 'error',
			title: 'TypeError: root is undefined',
		})
		expect(draft.data).toHaveProperty('stack')
	})

	it.each([
		{ description: 'a string', thrown: 'boom', expectedTitle: 'boom' },
		{ description: 'undefined', thrown: undefined, expectedTitle: 'undefined' },
		{
			description: 'a plain object',
			thrown: { reason: 'nope' },
			expectedTitle: '{"reason":"nope"}',
		},
	])('still reports $description thrown as is', ({ thrown, expectedTitle }) => {
		expect(describeProblem(thrown)).toMatchObject({ level: 'error', title: expectedTitle })
	})
})
