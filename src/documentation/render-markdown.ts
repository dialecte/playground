import { Marked } from 'marked'

import type { Renderer, Tokens } from 'marked'

const EXTERNAL_LINK = /^https?:\/\//i

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

/** Hands out one id per heading, told apart by a number when two headings read the same. */
function createHeadingIdAllocator(): (text: string) => string {
	const timesUsed = new Map<string, number>()

	return function allocateHeadingId(text: string): string {
		const slug = slugify(text)
		const previousCount = timesUsed.get(slug) ?? 0
		timesUsed.set(slug, previousCount + 1)
		return previousCount === 0 ? slug : `${slug}-${previousCount + 1}`
	}
}

function renderCode({ text, lang }: Tokens.Code): string {
	const language = lang?.split(/\s+/)[0]
	const languageClass = language ? ` class="language-${escapeHtml(language)}"` : ''

	// The button holds no code: the page reads it from the block next to it when it is clicked.
	return `<div class="code-block"><button type="button" data-copy-code>Copy</button><pre><code${languageClass}>${escapeHtml(text)}</code></pre></div>\n`
}

function renderLink(this: Renderer, { href, title, tokens }: Tokens.Link): string {
	const label = this.parser.parseInline(tokens)
	const titleAttribute = title ? ` title="${escapeHtml(title)}"` : ''
	const externalAttributes = EXTERNAL_LINK.test(href)
		? ' target="_blank" rel="noopener noreferrer"'
		: ''

	return `<a href="${escapeHtml(href)}"${titleAttribute}${externalAttributes}>${label}</a>`
}

/**
 * Turn a documentation page into HTML. The pages are shipped with the playground, so their content
 * is trusted; what is escaped is what a reader must SEE as text, such as `Array<string>` in code.
 * A fresh renderer per call keeps heading ids from one page out of the next.
 */
export function renderMarkdown(markdown: string): string {
	const allocateHeadingId = createHeadingIdAllocator()

	function renderHeading(this: Renderer, { tokens, depth, text }: Tokens.Heading): string {
		const label = this.parser.parseInline(tokens)
		return `<h${depth} id="${allocateHeadingId(text)}">${label}</h${depth}>\n`
	}

	const renderer = new Marked({
		gfm: true,
		renderer: { heading: renderHeading, code: renderCode, link: renderLink },
	})

	return renderer.parse(markdown, { async: false })
}
