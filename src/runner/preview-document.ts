import type {
	PreparedTransactionOf,
	PreviewableDocument,
	PreviewDocumentParams,
} from './runner.types'

/**
 * Thrown on purpose once a transaction has been staged for preview, to stop the script there. What
 * follows a transaction in a script usually reads what it wrote; letting it run against records
 * that were never committed would report nonsense.
 */
export class PreviewHalt extends Error {
	constructor() {
		super('The script stopped after staging its first transaction for preview.')
		this.name = 'PreviewHalt'
	}
}

/**
 * A stand-in for the loaded file whose `transaction` STAGES the changes instead of committing
 * them. Everything else is the live document. A script that opens its own document through
 * `project.openDocument` goes around this stand-in and commits for real.
 */
export function createPreviewDocument<GenericDocument extends PreviewableDocument>(
	params: PreviewDocumentParams<GenericDocument>,
): GenericDocument {
	const { document, onPrepared } = params

	async function stageInsteadOfCommitting(
		callback: unknown,
		options?: { label?: string },
	): Promise<never> {
		const preparedTransaction = await document.prepare(callback as never, options)
		onPrepared(preparedTransaction as PreparedTransactionOf<GenericDocument>, options?.label)
		throw new PreviewHalt()
	}

	return new Proxy(document, {
		get(target, propertyName, receiver) {
			if (propertyName === 'transaction') return stageInsteadOfCommitting

			const value: unknown = Reflect.get(target, propertyName, receiver)
			return typeof value === 'function' ? value.bind(target) : value
		},
	})
}
