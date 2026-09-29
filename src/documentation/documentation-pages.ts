import localDialecteMarkdown from '@/assets/docs/local-dialecte.md?raw'

import type { DocumentationPage } from './documentation.types'

/** Every page the playground ships. The first line of each is its title. */
export const DOCUMENTATION_PAGES: readonly DocumentationPage[] = [
	{
		id: 'local-dialecte',
		title: 'Set up a local dialecte',
		markdown: localDialecteMarkdown,
	},
]

export function findDocumentationPage(pageId: string): DocumentationPage | undefined {
	return DOCUMENTATION_PAGES.find((page) => page.id === pageId)
}
