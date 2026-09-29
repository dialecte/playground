import { renderMarkdown } from './render-markdown'

import { describe, expect, it } from 'vitest'

describe('renderMarkdown', () => {
	it('renders headings, paragraphs and inline code', () => {
		const html = renderMarkdown('# Title\n\nUse `npm run dev` now.')

		expect(html).toContain('<h1 id="title">Title</h1>')
		expect(html).toContain('<code>npm run dev</code>')
	})

	it('renders a table', () => {
		const html = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')

		expect(html).toContain('<table>')
		expect(html).toContain('<td>1</td>')
	})

	describe('code blocks', () => {
		const html = renderMarkdown('```sh\nnpm install\nnpm run dev\n```')

		it('keeps the language, so a block can be styled by it', () => {
			expect(html).toContain('class="language-sh"')
		})

		it('keeps every line of the command, unescaped for the reader', () => {
			expect(html).toContain('npm install\nnpm run dev')
		})

		it('offers a copy button, which carries no code of its own', () => {
			expect(html).toContain('<button type="button" data-copy-code')
			expect(html).not.toMatch(/<button[^>]*npm install/)
		})

		it('escapes what would otherwise be read as markup', () => {
			const escaped = renderMarkdown('```ts\nconst list: Array<string> = []\n```')

			expect(escaped).toContain('Array&lt;string&gt;')
			expect(escaped).not.toContain('<string>')
		})
	})

	describe('links', () => {
		it('opens an external link in a new tab, without handing over the opener', () => {
			const html = renderMarkdown('[docs](https://dialecte.github.io/core/)')

			expect(html).toContain('href="https://dialecte.github.io/core/"')
			expect(html).toContain('target="_blank"')
			expect(html).toContain('rel="noopener noreferrer"')
		})

		it('leaves an in-page anchor alone', () => {
			const html = renderMarkdown('[below](#troubleshooting)')

			expect(html).toContain('href="#troubleshooting"')
			expect(html).not.toContain('target=')
		})
	})

	describe('headings as anchors', () => {
		it('gives a heading the id its in-page links point at', () => {
			const html = renderMarkdown('## What you should see')

			expect(html).toContain('<h2 id="what-you-should-see">What you should see</h2>')
		})

		it('keeps two headings with the same text apart', () => {
			const html = renderMarkdown('## Notes\n\n## Notes')

			expect(html).toContain('id="notes"')
			expect(html).toContain('id="notes-2"')
		})

		it('does not carry the id of one page into the next render', () => {
			renderMarkdown('## Notes')
			const html = renderMarkdown('## Notes')

			expect(html).toContain('id="notes"')
			expect(html).not.toContain('id="notes-2"')
		})
	})
})
