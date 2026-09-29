import { describeCoreMismatch } from './describe-core-mismatch'

import { describe, expect, it } from 'vitest'

describe('describeCoreMismatch', () => {
	it.each([
		{ description: 'the same minor line', coreRange: '^0.4.2', installedCoreVersion: '0.4.16' },
		{ description: 'a tilde range', coreRange: '~0.4.16', installedCoreVersion: '0.4.16' },
		{ description: 'an exact version', coreRange: '0.4.16', installedCoreVersion: '0.4.16' },
		{ description: 'no declared range', coreRange: null, installedCoreVersion: '0.4.16' },
		{
			description: 'a range it cannot read',
			coreRange: 'file:../core',
			installedCoreVersion: '0.4.16',
		},
	])('stays silent for $description', ({ coreRange, installedCoreVersion }) => {
		expect(describeCoreMismatch({ coreRange, installedCoreVersion })).toBeNull()
	})

	it.each([
		{ description: 'an older minor line', coreRange: '^0.2.19', installedCoreVersion: '0.4.16' },
		{ description: 'another major line', coreRange: '^1.0.0', installedCoreVersion: '0.4.16' },
	])('warns about $description, naming both versions', ({ coreRange, installedCoreVersion }) => {
		const warning = describeCoreMismatch({ coreRange, installedCoreVersion })

		expect(warning).toContain(coreRange)
		expect(warning).toContain(installedCoreVersion)
	})
})
