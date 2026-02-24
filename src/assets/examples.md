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