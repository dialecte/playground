import { detectDialecte } from './detect-dialecte'

import { describe, expect, it } from 'vitest'

function createWidgetProject() {}
function createOtherProject() {}

const WIDGET_CONFIG = { rootElementName: 'Widget', definition: {}, elements: ['Widget'] }

describe('detectDialecte', () => {
	it('finds the project factory and the config by convention', () => {
		const result = detectDialecte({
			createWidgetProject,
			WIDGET_DIALECTE_CONFIG: WIDGET_CONFIG,
			WIDGET_NAMESPACES: { default: { uri: 'urn:widget', prefix: '' } },
		})

		expect(result).toEqual({
			isDetected: true,
			detectedExports: {
				createProjectExportName: 'createWidgetProject',
				createProject: createWidgetProject,
				configExportName: 'WIDGET_DIALECTE_CONFIG',
				config: WIDGET_CONFIG,
			},
		})
	})

	it.each([
		{
			description: 'no project factory is exported',
			moduleNamespace: { WIDGET_DIALECTE_CONFIG: WIDGET_CONFIG },
			expectedReason: 'no export named create<Name>Project',
		},
		{
			description: 'the factory-named export is not a function',
			moduleNamespace: { createWidgetProject: 'nope', WIDGET_DIALECTE_CONFIG: WIDGET_CONFIG },
			expectedReason: 'no export named create<Name>Project',
		},
		{
			description: 'several project factories are exported',
			moduleNamespace: {
				createWidgetProject,
				createOtherProject,
				WIDGET_DIALECTE_CONFIG: WIDGET_CONFIG,
			},
			expectedReason: 'createWidgetProject, createOtherProject',
		},
		{
			description: 'no config is exported',
			moduleNamespace: { createWidgetProject, SOMETHING: { rootElementName: 'Widget' } },
			expectedReason: 'no exported dialecte config',
		},
		{
			description: 'several configs are exported',
			moduleNamespace: {
				createWidgetProject,
				WIDGET_DIALECTE_CONFIG: WIDGET_CONFIG,
				LEGACY_DIALECTE_CONFIG: WIDGET_CONFIG,
			},
			expectedReason: 'WIDGET_DIALECTE_CONFIG, LEGACY_DIALECTE_CONFIG',
		},
	])('explains why when $description', ({ moduleNamespace, expectedReason }) => {
		const result = detectDialecte(moduleNamespace)

		expect(result.isDetected).toBe(false)
		expect(result).toHaveProperty('reason', expect.stringContaining(expectedReason))
	})
})
