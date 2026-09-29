import { prepareExecutableSource } from './prepare-executable-source'

import { describe, expect, it } from 'vitest'

const SOURCE_URL_COMMENT = '//# sourceURL=playground-script.js'

describe('prepareExecutableSource', () => {
	it('removes the empty export the compiler appends to a module without imports', () => {
		const prepared = prepareExecutableSource(
			'const root = await doc.query.getRoot();\nexport {};\n',
		)

		expect(prepared).toEqual({
			isExecutable: true,
			source: `const root = await doc.query.getRoot();\n\n${SOURCE_URL_COMMENT}`,
		})
	})

	it('names the script so a stack trace points at it', () => {
		const prepared = prepareExecutableSource('console.log(1)')

		expect(prepared).toEqual({
			isExecutable: true,
			source: `console.log(1)\n${SOURCE_URL_COMMENT}`,
		})
	})

	it('keeps a dynamic import, which is legal inside a function body', () => {
		const prepared = prepareExecutableSource(
			"const library = await import('https://esm.sh/nanoid')",
		)

		expect(prepared.isExecutable).toBe(true)
	})

	it.each([
		{ description: 'a named import', source: "import { Project } from '@dialecte/core'\n" },
		{ description: 'a namespace import', source: "import * as core from '@dialecte/core'\n" },
		{ description: 'a side-effect import', source: "  import './setup'\n" },
	])('refuses $description and says what to use instead', ({ source }) => {
		const prepared = prepareExecutableSource(source)

		expect(prepared.isExecutable).toBe(false)
		expect(prepared).toHaveProperty('reason', expect.stringContaining('dialecte'))
	})

	it('refuses a real export', () => {
		const prepared = prepareExecutableSource('export const answer = 42\n')

		expect(prepared.isExecutable).toBe(false)
		expect(prepared).toHaveProperty('reason', expect.stringContaining('export'))
	})
})
