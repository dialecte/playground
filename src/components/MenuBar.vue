<script setup lang="ts">
import { ref } from 'vue'
import {
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarPortal,
	MenubarRoot,
	MenubarTrigger,
} from 'reka-ui'



import { usePlaygroundStore } from '@/stores'

const props = defineProps<{ openFile: () => void }>()

const currentMenu = ref('')

//====== INITIALIZE ======//

// store
const store = usePlaygroundStore()

</script>

<template>
	<MenubarRoot v-model="currentMenu" class="flex items-center">
		<MenubarMenu value="file">
			<MenubarTrigger
				class="py-2 px-3 outline-none select-none font-semibold leading-none text-orange-500 text-xs flex items-center justify-between gap-[2px] data-[highlighted]:bg-orange-100 data-[state=open]:bg-orange-100"
			>
				File
			</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent
					class="min-w-[220px] outline-none bg-white p-[5px] border shadow-sm [animation-duration:_400ms] [animation-timing-function:_cubic-bezier(0.16,_1,_0.3,_1)] will-change-[transform,opacity]"
					align="start"
					:side-offset="5"
					:align-offset="-3"
				>
					<MenubarItem
						class="group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[state=open]:bg-orange-100 data-[state=open]:text-orange-500 data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-orange-500 data-[highlighted]:to-orange-500 data-[highlighted]:text-orange-100 data-[highlighted]:data-[state=open]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none"
						@click="props.openFile()"
					>
						Open File
						<div
              class="ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white group-data-[disabled]:text-gray-300"
            >
              ⌃ O
            </div>
					</MenubarItem>
					<MenubarItem
						class="group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[state=open]:bg-orange-100 data-[state=open]:text-orange-500 data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-orange-500 data-[highlighted]:to-orange-500 data-[highlighted]:text-orange-100 data-[highlighted]:data-[state=open]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none"
						@click="store.exportFile()"
					>
						Save File
						<div
              class="ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white group-data-[disabled]:text-gray-300"
            >
              ⌃ S
            </div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>

		<MenubarMenu value="Edit">
			<MenubarTrigger
				class="py-2 px-3 outline-none select-none font-semibold leading-none text-orange-500 text-xs flex items-center justify-between gap-[2px] data-[highlighted]:bg-orange-100 data-[state=open]:bg-orange-100"
			>
				Edit
			</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent
					class="min-w-[220px] outline-none bg-white p-[5px] border shadow-sm [animation-duration:_400ms] [animation-timing-function:_cubic-bezier(0.16,_1,_0.3,_1)] will-change-[transform,opacity]"
					align="start"
					:side-offset="5"
					:align-offset="-3"
				>
					<MenubarItem
						class="group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[state=open]:bg-orange-100 data-[state=open]:text-orange-500 data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-orange-500 data-[highlighted]:to-orange-500 data-[highlighted]:text-orange-100 data-[highlighted]:data-[state=open]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none"
						:disabled="!store.canUndo"
						@click="store.undo()"
					>
						Undo
						<div
							class="ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white group-data-[disabled]:text-gray-300"
						>
							⌘ Z
						</div>
					</MenubarItem>
					<MenubarItem
						class="group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[state=open]:bg-orange-100 data-[state=open]:text-orange-500 data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-orange-500 data-[highlighted]:to-orange-500 data-[highlighted]:text-orange-100 data-[highlighted]:data-[state=open]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none"
						:disabled="!store.canRedo"
						@click="store.redo()"
					>
						Redo
						<div
							class="ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white group-data-[disabled]:text-gray-300"
						>
							⇧ ⌘ Z
						</div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>

		<MenubarMenu value="Help">
			<MenubarTrigger
				class="py-2 px-3 outline-none select-none font-semibold leading-none text-orange-500 text-xs flex items-center justify-between gap-[2px] data-[highlighted]:bg-orange-100 data-[state=open]:bg-orange-100"
			>
				Help
			</MenubarTrigger>
			<MenubarPortal>
				<MenubarContent
					class="min-w-[220px] outline-none bg-white p-[5px] border shadow-sm [animation-duration:_400ms] [animation-timing-function:_cubic-bezier(0.16,_1,_0.3,_1)] will-change-[transform,opacity]"
					align="start"
					:side-offset="5"
					:align-offset="-3"
				>
					<MenubarItem
						class="group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[state=open]:bg-orange-100 data-[state=open]:text-orange-500 data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-orange-500 data-[highlighted]:to-orange-500 data-[highlighted]:text-orange-100 data-[highlighted]:data-[state=open]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none"
						as="a"
						href="https://dialecte.github.io/core/"
						target="_blank"
					>
						Core Documentation
						<div class="ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white">↗</div>
					</MenubarItem>
					<MenubarItem
						class="group text-xs leading-none text-orange-500 flex items-center h-[25px] px-[10px] relative select-none outline-none data-[state=open]:bg-orange-100 data-[state=open]:text-orange-500 data-[highlighted]:bg-gradient-to-br data-[highlighted]:from-orange-500 data-[highlighted]:to-orange-500 data-[highlighted]:text-orange-100 data-[highlighted]:data-[state=open]:text-orange-100 data-[disabled]:text-gray-300 data-[disabled]:pointer-events-none"
						as="a"
						href="https://dialecte.github.io/scl/"
						target="_blank"
					>
						SCL Documentation
						<div class="ml-auto pl-5 text-gray-500 group-data-[highlighted]:text-white">↗</div>
					</MenubarItem>
				</MenubarContent>
			</MenubarPortal>
		</MenubarMenu>
	</MenubarRoot>
</template>
