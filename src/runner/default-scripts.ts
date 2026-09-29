const GLOBALS_REMINDER = `// In scope:
//   project     the project the playground opened
//   doc         the loaded file: doc.query, doc.transaction(...), doc.prepare(...)
//   documentId  its identifier inside the project
//   dialecte    everything the active dialecte exports
//   helpers     type guards and converters from @dialecte/core/helpers
//   utils       invariant, formatXml, … from @dialecte/core/utils
// Every stage of a run is reported in the console below.
`

const SCL_SCRIPT = `${GLOBALS_REMINDER}
const root = await doc.query.getRoot()
const { Substation: substations } = await doc.query.findDescendants(root, {
	collect: 'Substation',
})
console.log(\`\${substations.length} substation(s) found\`)

await doc.transaction(
	async (tx) => {
		const substation = substations[0]
		if (!substation) return

		tx.progress.plan({ steps: 2, label: 'Adding voltage levels' })
		tx.progress.nextStep('VL1')
		await tx.addChild(substation, { tagName: 'VoltageLevel', attributes: { name: 'VL1' } })
		tx.progress.nextStep('VL2')
		await tx.addChild(substation, { tagName: 'VoltageLevel', attributes: { name: 'VL2' } })
	},
	{ label: 'Add two voltage levels' },
)
`

const GENERIC_SCRIPT = `${GLOBALS_REMINDER}
const root = await doc.query.getRoot()
const tree = await doc.query.getTree(root, { depth: 1 })
console.log('root', tree)
`

/** Starting point shown the first time a dialecte is used. */
export function readDefaultScript(dialecteId: string): string {
	return dialecteId === 'scl' ? SCL_SCRIPT : GENERIC_SCRIPT
}
