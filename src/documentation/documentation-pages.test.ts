import { DOCUMENTATION_PAGES, findDocumentationPage } from './documentation-pages'
import { renderMarkdown } from './render-markdown'

import { describe, expect, it } from 'vitest'

const IN_PAGE_LINK = /\]\(#([^)]+)\)/g
const HEADING_ID = /<h[1-6] id="([^"]+)"/g

function collectAll(pattern: RegExp, text: string): string[] {
	return [...text.matchAll(pattern)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
}

describe('the documentation pages', () => {
	it('have unique ids', () => {
		const ids = DOCUMENTATION_PAGES.map((page) => page.id)

		expect(new Set(ids).size).toBe(ids.length)
	})

	it.each(DOCUMENTATION_PAGES)('$id: has a title and some content', (page) => {
		expect(page.title.trim()).not.toBe('')
		expect(page.markdown.trim().length).toBeGreaterThan(100)
	})

	it.each(DOCUMENTATION_PAGES)('$id: every in-page link leads to a heading of the page', (page) => {
		const linkTargets = collectAll(IN_PAGE_LINK, page.markdown)
		const headingIds = collectAll(HEADING_ID, renderMarkdown(page.markdown))

		for (const target of linkTargets) expect(headingIds).toContain(target)
	})

	it.each(DOCUMENTATION_PAGES)('$id: starts with the title it is listed under', (page) => {
		const firstHeading = /^# (.+)$/m.exec(page.markdown)?.[1]

		expect(firstHeading).toBe(page.title)
	})
})

describe('findDocumentationPage', () => {
	it('finds a page by its id', () => {
		expect(findDocumentationPage('local-dialecte')?.title).toBe('Set up a local dialecte')
	})

	it('finds nothing for an id nobody registered', () => {
		expect(findDocumentationPage('no-such-page')).toBeUndefined()
	})
})
