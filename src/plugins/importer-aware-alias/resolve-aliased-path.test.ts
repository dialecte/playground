import { resolveAliasedPath } from './resolve-aliased-path'

import { describe, expect, it } from 'vitest'

const PLAYGROUND_SOURCE_ROOT = '/work/playground/src'
const LOCAL_DIALECTE_ROOT = '/work/my-dialecte'
const LOCAL_DIALECTE_SOURCE_ROOT = '/work/my-dialecte/src'

const SCOPED_SOURCE_ROOTS = [
	{ packageRoot: LOCAL_DIALECTE_ROOT, sourceRoot: LOCAL_DIALECTE_SOURCE_ROOT },
]

type TestCase = {
	description: string
	source: string
	importer: string | undefined
	expected: string | null
}

const TEST_CASES: TestCase[] = [
	{
		description: 'ignores a source that does not use the alias',
		source: './sibling',
		importer: '/work/playground/src/main.ts',
		expected: null,
	},
	{
		description: 'ignores a package whose name merely starts with the alias character',
		source: '@dialecte/core',
		importer: '/work/playground/src/main.ts',
		expected: null,
	},
	{
		description: 'maps to the playground sources for a playground importer',
		source: '@/console/event-log',
		importer: '/work/playground/src/main.ts',
		expected: '/work/playground/src/console/event-log',
	},
	{
		description: 'maps to the local dialecte sources for an importer inside that package',
		source: '@/v1/config',
		importer: '/work/my-dialecte/src/v1/dialecte.ts',
		expected: '/work/my-dialecte/src/v1/config',
	},
	{
		description: 'strips the query string of the importer before matching its root',
		source: '@/v1/config',
		importer: '/work/my-dialecte/src/v1/dialecte.ts?t=1726912345',
		expected: '/work/my-dialecte/src/v1/config',
	},
	{
		description: 'does not match a sibling folder sharing the package root as a prefix',
		source: '@/v1/config',
		importer: '/work/my-dialecte-other/src/index.ts',
		expected: '/work/playground/src/v1/config',
	},
	{
		description: 'falls back to the playground sources for a virtual importer',
		source: '@/workspace/workspace.service',
		importer: '\0virtual:local-dialecte',
		expected: '/work/playground/src/workspace/workspace.service',
	},
	{
		description: 'falls back to the playground sources when there is no importer',
		source: '@/main',
		importer: undefined,
		expected: '/work/playground/src/main',
	},
]

describe('resolveAliasedPath', () => {
	it.each(TEST_CASES)('$description', ({ source, importer, expected }) => {
		const resolved = resolveAliasedPath({
			source,
			importer,
			defaultSourceRoot: PLAYGROUND_SOURCE_ROOT,
			scopedSourceRoots: SCOPED_SOURCE_ROOTS,
		})

		expect(resolved).toBe(expected)
	})
})
