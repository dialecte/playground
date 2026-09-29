import { buildGlobalsDeclaration } from './build-globals-declaration'

import { describe, expect, it } from 'vitest'

const DECLARATION = buildGlobalsDeclaration({
	packageSpecifier: '@acme/widget/v1',
	createProjectExportName: 'createWidgetProject',
})

describe('buildGlobalsDeclaration', () => {
	it('types the project against the factory of the active dialecte', () => {
		expect(DECLARATION).toContain(
			'import { createWidgetProject as _createProject } from "@acme/widget/v1"',
		)
		expect(DECLARATION).toContain('import * as _dialecte from "@acme/widget/v1"')
	})

	it('types the project from a call of the factory, so its type parameters take their defaults', () => {
		expect(DECLARATION).toContain('const _project = _createProject()')
		expect(DECLARATION).toMatch(/\bconst project: typeof _project\b/)
		expect(DECLARATION).not.toContain('ReturnType<typeof _createProject>')
	})

	it.each(['project', 'doc', 'documentId', 'dialecte', 'helpers', 'utils'])(
		'declares the %s global',
		(globalName) => {
			expect(DECLARATION).toMatch(new RegExp(`\\bconst ${globalName}: `))
		},
	)

	it('declares the console, which the editor does not know about on its own', () => {
		expect(DECLARATION).toMatch(/\bconst console: Console\b/)
		expect(DECLARATION).toContain('log(...loggedArguments: any[]): void')
	})

	it('leaves the browser document global alone', () => {
		expect(DECLARATION).not.toMatch(/\bconst document\b/)
	})

	it('is a module, so the global augmentation is legal', () => {
		expect(DECLARATION).toContain('declare global {')
		expect(DECLARATION.trimEnd().endsWith('export {}')).toBe(true)
	})
})
