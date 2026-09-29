import { useOpenFile } from './use-open-file.composable'

import { useEventListener } from '@vueuse/core'

import { useRunnerStore } from '@/runner/runner.store'
import { useWorkspaceStore } from '@/workspace/workspace.store'

const CODE_PANEL_ID = 'code-panel'

function isTypingInCodeEditor(): boolean {
	const focusedElement = document.activeElement
	if (focusedElement === null) return false
	return document.getElementById(CODE_PANEL_ID)?.contains(focusedElement) ?? false
}

/**
 * Global shortcuts. Undo and redo act on the loaded file everywhere EXCEPT inside the script
 * editor, where they belong to the text being typed.
 */
export function useShortcuts(): void {
	const runnerStore = useRunnerStore()
	const workspaceStore = useWorkspaceStore()
	const { openFileDialog } = useOpenFile()

	function handleKeydown(keyboardEvent: KeyboardEvent): void {
		const isModified = keyboardEvent.metaKey || keyboardEvent.ctrlKey
		if (!isModified) return

		const pressedKey = keyboardEvent.key.toLowerCase()

		if (pressedKey === 'enter') {
			keyboardEvent.preventDefault()
			runnerStore.run()
			return
		}
		if (pressedKey === 'o') {
			keyboardEvent.preventDefault()
			openFileDialog()
			return
		}
		if (pressedKey === 's') {
			keyboardEvent.preventDefault()
			workspaceStore.saveFile()
			return
		}
		if (pressedKey === 'z' && !isTypingInCodeEditor()) {
			keyboardEvent.preventDefault()
			keyboardEvent.stopPropagation()
			if (keyboardEvent.shiftKey) workspaceStore.redoLastChange()
			else workspaceStore.undoLastChange()
		}
	}

	useEventListener(window, 'keydown', handleKeydown, { capture: true })
}
