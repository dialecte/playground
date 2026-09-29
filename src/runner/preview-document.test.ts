import { PreviewHalt, createPreviewDocument } from './preview-document'

import { describe, expect, it } from 'vitest'

function createFakeDocument() {
	const calls: string[] = []
	const prepared = { summary: { creates: 1, updates: 0, deletes: 0 }, operations: [] }

	const fakeDocument = {
		documentId: 'document-1',
		query: { name: 'live-query' },
		async transaction(_callback: unknown, _options?: { label?: string }): Promise<void> {
			calls.push('transaction')
		},
		async prepare(callback: unknown, options?: { label?: string }) {
			calls.push(`prepare:${typeof callback}:${options?.label ?? 'no-label'}`)
			return prepared
		},
		describeSelf(): string {
			return `document ${this.documentId}`
		},
	}

	return { fakeDocument, calls, prepared }
}

describe('createPreviewDocument', () => {
	it('stages a transaction instead of committing it, then halts the script', async () => {
		const { fakeDocument, calls, prepared } = createFakeDocument()
		const received: unknown[] = []
		const previewDocument = createPreviewDocument({
			document: fakeDocument,
			onPrepared: (preparedTransaction, label) => received.push({ preparedTransaction, label }),
		})

		const staging = previewDocument.transaction(async () => {}, { label: 'Add bay' })

		await expect(staging).rejects.toBeInstanceOf(PreviewHalt)
		expect(calls).toEqual(['prepare:function:Add bay'])
		expect(received).toEqual([{ preparedTransaction: prepared, label: 'Add bay' }])
	})

	it('hands over an unlabelled transaction without a label', async () => {
		const { fakeDocument } = createFakeDocument()
		const labels: unknown[] = []
		const previewDocument = createPreviewDocument({
			document: fakeDocument,
			onPrepared: (_preparedTransaction, label) => labels.push(label),
		})

		await previewDocument.transaction(async () => {}).catch(() => {})

		expect(labels).toEqual([undefined])
	})

	it('lets a failure of the staging itself through, untouched', async () => {
		const { fakeDocument } = createFakeDocument()
		const stagingFailure = new Error('invalid child')
		fakeDocument.prepare = async () => {
			throw stagingFailure
		}
		const previewDocument = createPreviewDocument({ document: fakeDocument, onPrepared: () => {} })

		await expect(previewDocument.transaction(async () => {})).rejects.toBe(stagingFailure)
	})

	it('passes everything else through to the live document', () => {
		const { fakeDocument } = createFakeDocument()
		const previewDocument = createPreviewDocument({ document: fakeDocument, onPrepared: () => {} })

		expect(previewDocument.documentId).toBe('document-1')
		expect(previewDocument.query).toBe(fakeDocument.query)
	})

	it('keeps methods bound to the live document', () => {
		const { fakeDocument } = createFakeDocument()
		const previewDocument = createPreviewDocument({ document: fakeDocument, onPrepared: () => {} })
		const { describeSelf } = previewDocument

		expect(describeSelf()).toBe('document document-1')
	})
})
