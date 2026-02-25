```ts
// FUNCTION EXTRACTION
const dialecte = createSclDialecte({ databaseName: DATABASE_NAME })

const sourceFunction = dialecte
	.fromRoot()
	.goToElement({ tagName: 'Function', id: '' })


const targetDialecte = createSclDialecte({ databaseName: 'function' })

const chains = await sourceFunction.extractTo({
target: { extension: 'FSD', chain: targetDialecte.fromRoot(), level: 'Substation' },
})

await chains.targetChain.commit()

await exportSclFile({ databaseName: 'test', extension: '.fsd', withDownload: true })

```

```ts

const dialecte = createSclDialecte({ databaseName: DATABASE_NAME })

const currentChain = dialecte
	.fromRoot()

const { uuid: currentFunctionUuid } = await currentChain.goToElement({ tagName: 'Function', id: 'c0b09087-7055-48db-9b83-77c3e9e2d974' }).getAttributesValues()

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
		.update({ value: String(index)})
		.goToElement({ tagName: 'SCL' })
}


currentChainWithUpdatedFunctionCatRefs.commit()


```