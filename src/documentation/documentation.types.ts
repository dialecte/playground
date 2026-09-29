export type DocumentationPage = {
	/** Stable identifier, used to open the page. */
	id: string
	/** Shown as the title of the page, and as the label of the menu entry that opens it. */
	title: string
	markdown: string
}
