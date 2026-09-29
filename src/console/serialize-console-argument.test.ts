import { serializeConsoleArgument } from './serialize-console-argument'

import { describe, expect, it } from 'vitest'

describe('serializeConsoleArgument', () => {
	it.each([
		{ description: 'a string', value: 'hello', expected: 'hello' },
		{ description: 'a number', value: 42, expected: 42 },
		{ description: 'a boolean', value: false, expected: false },
		{ description: 'null', value: null, expected: null },
		{ description: 'undefined', value: undefined, expected: '[undefined]' },
		{ description: 'a bigint', value: 12n, expected: '12n' },
		{ description: 'a symbol', value: Symbol('tag'), expected: 'Symbol(tag)' },
		{ description: 'NaN', value: Number.NaN, expected: '[NaN]' },
		{ description: 'Infinity', value: Number.POSITIVE_INFINITY, expected: '[Infinity]' },
		{
			description: 'a date',
			value: new Date('2026-01-02T03:04:05.000Z'),
			expected: '2026-01-02T03:04:05.000Z',
		},
	])('keeps $description readable', ({ value, expected }) => {
		expect(serializeConsoleArgument(value)).toEqual(expected)
	})

	it('names a function instead of dropping it', () => {
		function addChild() {}

		expect(serializeConsoleArgument(addChild)).toBe('[Function addChild]')
	})

	it('walks plain objects and arrays', () => {
		const record = { tagName: 'Bay', attributes: [{ name: 'name', value: 'Q01' }] }

		expect(serializeConsoleArgument(record)).toEqual(record)
	})

	it('marks a circular reference instead of throwing', () => {
		const parent: Record<string, unknown> = { tagName: 'Bay' }
		parent.self = parent

		expect(serializeConsoleArgument(parent)).toEqual({ tagName: 'Bay', self: '[Circular]' })
	})

	it('serializes the same object twice when it is not circular', () => {
		const shared = { id: '1' }

		expect(serializeConsoleArgument({ first: shared, second: shared })).toEqual({
			first: { id: '1' },
			second: { id: '1' },
		})
	})

	it('exposes Map entries and Set values', () => {
		const documents = new Map([['doc-1', { canUndo: true }]])
		const tags = new Set(['Bay', 'LNode'])

		expect(serializeConsoleArgument(documents)).toEqual({
			'[Map]': [['doc-1', { canUndo: true }]],
		})
		expect(serializeConsoleArgument(tags)).toEqual({ '[Set]': ['Bay', 'LNode'] })
	})

	it('keeps the name, message and cause of an error', () => {
		const cause = { code: 'D2001', key: 'ELEMENT_NOT_FOUND' }
		const error = new Error('Element not found', { cause })

		expect(serializeConsoleArgument(error)).toMatchObject({
			name: 'Error',
			message: 'Element not found',
			cause,
		})
	})

	it('summarizes a DOM-like node by its markup', () => {
		const node = { nodeType: 1, nodeName: 'Bay', outerHTML: '<Bay name="Q01"/>' }

		expect(serializeConsoleArgument(node)).toBe('<Bay name="Q01"/>')
	})

	it('stops at the maximum depth', () => {
		const deep = { level1: { level2: { level3: { level4: { level5: { level6: 'bottom' } } } } } }

		expect(serializeConsoleArgument(deep)).toEqual({
			level1: { level2: { level3: { level4: { level5: '[Object]' } } } },
		})
	})

	it('truncates a long array and says how many items were left out', () => {
		const items = Array.from({ length: 205 }, (_unused, index) => index)
		const serialized = serializeConsoleArgument(items)

		expect(Array.isArray(serialized)).toBe(true)
		expect(serialized).toHaveLength(201)
		expect((serialized as unknown[])[200]).toBe('[5 more items]')
	})
})
