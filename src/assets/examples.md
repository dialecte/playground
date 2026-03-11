## Chained API

```ts
// FUNCTION EXTRACTION
const dialecte = createSclDialecte({ databaseName: DATABASE_NAME })

const mainChain = dialecte.fromRoot()

const targetDialecte = createSclDialecte({ databaseName: 'temp' })

const chains = await mainChain
	.goToElement({ tagName: 'Function', id: '4de499c0-c9c7-42a7-aab6-bca600b717d5' })
	.extractTo({
		target: {
			extension: 'FSD',
			chain: targetDialecte.fromRoot(),
			level: 'Substation',
		},
	})

chains.targetChain.commit()

exportSclFile({ databaseName: 'temp', extension: '.fsd', withDownload: true })
```

```ts
const dialecte = createSclDialecte({ databaseName: DATABASE_NAME })

const currentChain = dialecte.fromRoot()

const { uuid: currentFunctionUuid } = await currentChain
	.goToElement({ tagName: 'Function', id: 'c0b09087-7055-48db-9b83-77c3e9e2d974' })
	.getAttributesValues()

const { FunctionCatRef: functionCatRefs } = await currentChain.findDescendants({
	tagName: 'FunctionCategory',
	descendant: {
		tagName: 'SubCategory',
		descendant: {
			tagName: 'FunctionCatRef',
			attributes: { functionUuid: currentFunctionUuid },
		},
	},
})

console.log(functionCatRefs)

let currentChainWithUpdatedFunctionCatRefs = currentChain

for (const [index, functionCatRef] of functionCatRefs.entries()) {
	currentChainWithUpdatedFunctionCatRefs = currentChainWithUpdatedFunctionCatRefs
		.goToElement({ tagName: functionCatRef.tagName, id: functionCatRef.id })
		.update({ value: String(index) })
		.goToElement({ tagName: 'SCL' })
}

currentChainWithUpdatedFunctionCatRefs.commit()
```

# New API

```ts
// ADD A VOLTAGE LEVEL
const document = openSclDocument({ type: 'local', databaseName: DATABASE_NAME })

await document.transaction(async (tx) => {
	const root = await tx.getRoot()
	const substations = await tx.findChildren(root, { tagName: 'Substation' })
	if (substations.length > 0) {
		await tx.addChild(substations[0], { tagName: 'VoltageLevel', attributes: { name: 'VL1' } })
	}
})
```

```ts
// EXPORT TO FILE
const document = openSclDocument({ type: 'local', databaseName: DATABASE_NAME })

const root = await document.query.getRoot()
const substations = await document.query.findChildren(root, { tagName: 'Substation' })
console.log('Substations:', substations.length)

await exportSclFile({ databaseName: DATABASE_NAME, extension: '.scd', withDownload: true })
```
