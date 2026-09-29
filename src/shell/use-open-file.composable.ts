import { createSharedComposable, useFileDialog } from '@vueuse/core'

import { useWorkspaceStore } from '@/workspace/workspace.store'

/**
 * The one file dialog of the playground, shared by the menu and the keyboard shortcut. It accepts
 * whatever extensions the active dialecte declares.
 */
export const useOpenFile = createSharedComposable(function useOpenFile() {
	const workspaceStore = useWorkspaceStore()
	const { open, onChange } = useFileDialog({ multiple: false })

	onChange(async function openChosenFile(chosenFiles: FileList | null): Promise<void> {
		const chosenFile = chosenFiles?.item(0)
		if (chosenFile) await workspaceStore.openFile(chosenFile)
	})

	function openFileDialog(): void {
		open({ accept: workspaceStore.acceptedFileExtensions })
	}

	return { openFileDialog }
})
