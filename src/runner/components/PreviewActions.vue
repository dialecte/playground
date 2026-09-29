<script setup lang="ts">
import type { PendingPreview } from '@/runner/runner.types'

defineProps<{ preview: PendingPreview }>()

const emit = defineEmits<{ commit: []; discard: [] }>()
</script>

<template>
	<div
		class="px-3 py-1.5 bg-orange-50 border-b border-orange-200 text-xs flex items-center gap-3 shrink-0"
		data-testid="preview-actions"
	>
		<span class="font-semibold text-orange-600">Staged, not committed</span>
		<span class="text-gray-600 truncate">{{ preview.label ?? 'unlabelled transaction' }}</span>
		<span class="font-mono text-gray-500 whitespace-nowrap">
			+{{ preview.creates }} ~{{ preview.updates }} -{{ preview.deletes }}
		</span>
		<div class="ml-auto flex items-center gap-2">
			<button
				class="px-2.5 py-1 bg-orange-500 text-white rounded hover:bg-orange-700 transition-colors"
				data-testid="preview-commit"
				@click="emit('commit')"
			>
				Commit
			</button>
			<button
				class="px-2.5 py-1 border border-gray-300 text-gray-500 rounded hover:bg-white transition-colors"
				data-testid="preview-discard"
				@click="emit('discard')"
			>
				Discard
			</button>
		</div>
	</div>
</template>
