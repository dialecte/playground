import { readLocalDialecteManifest } from './local-dialecte-manifest'

import { describe, expect, it } from 'vitest'

const PACKAGE_ROOT = '/work/widget'

const SCAFFOLDED_PACKAGE_JSON = {
	name: '@acme/widget',
	version: '0.0.1',
	exports: {
		'./v1': { types: './dist/v1/index.d.ts', default: './dist/v1/index.js' },
		'./v1/test': { types: './dist/v1/test.d.ts', default: './dist/v1/test.js' },
	},
	dependencies: { '@dialecte/core': '^0.4.16' },
}

describe('readLocalDialecteManifest', () => {
	it('derives the source entry from the public entry of a scaffolded package', () => {
		const result = readLocalDialecteManifest({
			packageJson: SCAFFOLDED_PACKAGE_JSON,
			packageRoot: PACKAGE_ROOT,
		})

		expect(result).toEqual({
			isReadable: true,
			manifest: {
				packageName: '@acme/widget',
				packageVersion: '0.0.1',
				versionFolder: 'v1',
				packageSpecifier: '@acme/widget/v1',
				packageRoot: '/work/widget',
				sourceRoot: '/work/widget/src',
				sourceEntry: '/work/widget/src/v1/index.ts',
				coreRange: '^0.4.16',
			},
		})
	})

	it('skips the test entry even when it is listed first', () => {
		const result = readLocalDialecteManifest({
			packageJson: {
				...SCAFFOLDED_PACKAGE_JSON,
				exports: { './v2/test': {}, './v2': {} },
			},
			packageRoot: PACKAGE_ROOT,
		})

		expect(result).toMatchObject({ isReadable: true, manifest: { versionFolder: 'v2' } })
	})

	it('reports no engine range when the package declares none', () => {
		const { dependencies: _unused, ...withoutDependencies } = SCAFFOLDED_PACKAGE_JSON
		const result = readLocalDialecteManifest({
			packageJson: withoutDependencies,
			packageRoot: PACKAGE_ROOT,
		})

		expect(result).toMatchObject({ isReadable: true, manifest: { coreRange: null } })
	})

	it.each([
		{
			description: 'the package has no name',
			packageJson: { ...SCAFFOLDED_PACKAGE_JSON, name: undefined },
			expectedReason: 'name',
		},
		{
			description: 'the package exposes no entry',
			packageJson: { ...SCAFFOLDED_PACKAGE_JSON, exports: undefined },
			expectedReason: 'exports',
		},
		{
			description: 'the package only exposes a test entry',
			packageJson: { ...SCAFFOLDED_PACKAGE_JSON, exports: { './v1/test': {} } },
			expectedReason: 'exports',
		},
		{
			description: 'the package only exposes its root',
			packageJson: { ...SCAFFOLDED_PACKAGE_JSON, exports: { '.': {} } },
			expectedReason: 'exports',
		},
	])('explains why when $description', ({ packageJson, expectedReason }) => {
		const result = readLocalDialecteManifest({ packageJson, packageRoot: PACKAGE_ROOT })

		expect(result.isReadable).toBe(false)
		expect(result).toHaveProperty('reason', expect.stringContaining(expectedReason))
	})
})
