declare module 'virtual:dts-libs' {
	const libs: Record<string, string>
	export default libs
}

declare module 'virtual:local-dialecte' {
	import type { LocalDialecteMeta } from '@/plugins/local-dialecte/local-dialecte.types'

	/** Everything the plugged dialecte exports, or `null` when none is plugged. */
	export const localDialecteModule: Record<string, unknown> | null
	export const localDialecteMeta: LocalDialecteMeta | null
}
