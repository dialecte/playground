<script setup lang="ts">
import { useOpenFile } from '../use-open-file.composable'

import {
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarPortal,
	MenubarRoot,
	MenubarSeparator,
	MenubarTrigger,
} from 'reka-ui'
import { ref } from 'vue'

import { useDialecteRegistryStore } from '@/dialecte-registry/dialecte-registry.store'
import { DOCUMENTATION_PAGES } from '@/documentation/documentation-pages'
import { useDocumentationStore } from '@/documentation/documentation.store'
import { useWorkspaceStore } from '@/workspace/workspace.store'

const TRIGGER_CLASSES =
	'py-2 px-3 outline-none select-none font-semibold leading-none text-orange-500 text-xs flex items-center justify-between gap-[2px] data-[highlighted]:bg-orange-100 data-[state=open]:bg-orange-100'

const CONTENT_CLASSES =
	'min-w-[220px] outline-none bg-white p-[5px] border shadow-sm [animation-duration:_400ms] [animation-timing-function:_cubic-bezier(0.16,_1,_0.3,_1)] will-change-[transform,opacity]'

const ITEM_CLASSES =
	'group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[highlighted]:bg-orange-500 data-[highlighted]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none'

const HINT_CLASSES =
	'ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white group-data-[disabled]:text-gray-300'

const DOCUMENTATION_LINKS = [
	{ label: 'Core Documentation', url: 'https://dialecte.github.io/core/' },
	{ label: 'SCL Documentation', url: 'https://dialecte.github.io/scl/' },
]

const registryStore = useDialecteRegistryStore()
const workspaceStore = useWorkspaceStore()
const documentationStore = useDocumentationStore()
const { openFileDialog } = useOpenFile()

const openMenu = ref('')

function openDocumentation(url: string): void {
	window.open(url, '_blank', 'noopener')
}
</script>

<template>
	<MenubarRoot v-model="openMenu" class="flex items-center">
		<MenubarMenu value="file">
			<MenubarTrigger :class="TRIGGER_CLASSES">File</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent :class="CONTENT_CLASSES" align="start" :side-offset="5" :align-offset="-3">
					<MenubarItem :class="ITEM_CLASSES" @click="openFileDialog()">
						Open File
						<div :class="HINT_CLASSES">⌘ O</div>
					</MenubarItem>
					<MenubarItem
						:class="ITEM_CLASSES"
						:disabled="!workspaceStore.hasDocument"
						@click="workspaceStore.saveFile()"
					>
						Save File
						<div :class="HINT_CLASSES">⌘ S</div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>

		<MenubarMenu value="edit">
			<MenubarTrigger :class="TRIGGER_CLASSES">Edit</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent :class="CONTENT_CLASSES" align="start" :side-offset="5" :align-offset="-3">
					<MenubarItem
						:class="ITEM_CLASSES"
						:disabled="!workspaceStore.snapshot.canUndo"
						@click="workspaceStore.undoLastChange()"
					>
						Undo
						<div :class="HINT_CLASSES">⌘ Z</div>
					</MenubarItem>
					<MenubarItem
						:class="ITEM_CLASSES"
						:disabled="!workspaceStore.snapshot.canRedo"
						@click="workspaceStore.redoLastChange()"
					>
						Redo
						<div :class="HINT_CLASSES">⇧ ⌘ Z</div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>

		<MenubarMenu v-if="registryStore.availableDialectes.length > 1" value="dialecte">
			<MenubarTrigger :class="TRIGGER_CLASSES">Dialecte</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent :class="CONTENT_CLASSES" align="start" :side-offset="5" :align-offset="-3">
					<MenubarItem
						v-for="dialecte in registryStore.availableDialectes"
						:key="dialecte.id"
						:class="ITEM_CLASSES"
						@click="registryStore.activateDialecte(dialecte.id)"
					>
						{{ dialecte.label }}
						<div :class="HINT_CLASSES">
							{{ dialecte.id === registryStore.activeDialecte.id ? '●' : dialecte.source }}
						</div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>

		<MenubarMenu value="help">
			<MenubarTrigger :class="TRIGGER_CLASSES">Help</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent :class="CONTENT_CLASSES" align="start" :side-offset="5" :align-offset="-3">
					<MenubarItem
						v-for="page in DOCUMENTATION_PAGES"
						:key="page.id"
						:class="ITEM_CLASSES"
						:data-testid="`help-${page.id}`"
						@click="documentationStore.showPage(page.id)"
					>
						{{ page.title }}
					</MenubarItem>
					<MenubarSeparator class="h-px bg-gray-200 my-1" />
					<MenubarItem
						v-for="link in DOCUMENTATION_LINKS"
						:key="link.url"
						:class="ITEM_CLASSES"
						@click="openDocumentation(link.url)"
					>
						{{ link.label }}
						<div :class="HINT_CLASSES">↗</div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>
	</MenubarRoot>
</template>
