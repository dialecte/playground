# Script examples

Paste any of these in the editor. They use the globals the playground puts in scope: `project`,
`doc`, `documentId`, `dialecte`, `helpers`, `utils`. The SCL ones need an SCL file loaded.

## Read

```ts
const root = await doc.query.getRoot()
const { Bay: bays, VoltageLevel: voltageLevels } = await doc.query.findDescendants(root, {
	collect: ['Bay', 'VoltageLevel'],
})
console.log(`${voltageLevels.length} voltage levels, ${bays.length} bays`)

for (const bay of bays) {
	const attributes = await doc.query.getAttributes(bay)
	console.log(bay.id, attributes)
}
```

## Look at part of the tree

```ts
const root = await doc.query.getRoot()
// depth 1: the root and its direct children; deeper branches stay collapsed
const tree = await doc.query.getTree(root, { depth: 1 })
console.log(tree)
```

## Write, with a label and progress

The label shows up in the console history; progress shows as a single row while it runs.

```ts
const root = await doc.query.getRoot()
const { Substation: substations } = await doc.query.findDescendants(root, {
	collect: 'Substation',
})

await doc.transaction(
	async (tx) => {
		const names = ['VL1', 'VL2', 'VL3']
		tx.progress.plan({ steps: names.length, label: 'Adding voltage levels' })

		for (const name of names) {
			tx.progress.nextStep(name)
			await tx.addChild(substations[0], { tagName: 'VoltageLevel', attributes: { name } })
		}
	},
	{ label: 'Add three voltage levels' },
)
```

## Stage, inspect, then decide

Tick **Preview** to do this for any script without changing it. By hand:

```ts
const root = await doc.query.getRoot()
const prepared = await doc.prepare(async (tx) => {
	await tx.update(root, { attributes: { version: '2007' } })
})

console.log(prepared.summary) // { creates, updates, deletes }
console.log(prepared.operations)

await prepared.commit() // or prepared.discard()
```

## Fail on purpose

A structured error reaches the Problems tab with its key, code, method and element.

```ts
const record = await doc.query.getRecord({ tagName: 'Bay', id: 'no-such-bay' })
utils.invariant(record, { key: 'ELEMENT_NOT_FOUND', detail: 'bay no-such-bay is missing' })
```

## Use what the active dialecte exports

```ts
console.log(Object.keys(dialecte))
console.log(project.name, documentId)
```
