import { publishEvent } from '@/console/event-sink'
import { serializeConsoleArgument } from '@/console/serialize-console-argument'

import type { ConsoleMethodName, ExecuteScriptParams } from './runner.types'
import type { EventLevel } from '@/console/event-log.types'

type AsyncFunctionConstructor = new (
	...parameterNamesAndBody: string[]
) => (...parameterValues: unknown[]) => Promise<unknown>

const AsyncFunction = Object.getPrototypeOf(async function noop() {})
	.constructor as AsyncFunctionConstructor

const CONSOLE_METHOD_LEVELS: Record<ConsoleMethodName, EventLevel> = {
	log: 'info',
	info: 'info',
	debug: 'debug',
	warn: 'warning',
	error: 'error',
}

const CONSOLE_METHOD_NAMES = Object.keys(CONSOLE_METHOD_LEVELS) as ConsoleMethodName[]

function formatTitle(loggedArguments: unknown[]): string {
	return loggedArguments
		.map((loggedArgument) =>
			typeof loggedArgument === 'string'
				? loggedArgument
				: JSON.stringify(serializeConsoleArgument(loggedArgument)),
		)
		.join(' ')
}

/**
 * Mirror console output into the playground log while a script runs. The capture is global on
 * purpose: what a dialecte logs from inside a query or a transaction is part of what happened.
 * Returns the function that puts the real console back.
 */
function captureConsole(): () => void {
	const originalMethods = new Map<ConsoleMethodName, (...loggedArguments: unknown[]) => void>()

	for (const methodName of CONSOLE_METHOD_NAMES) {
		const originalMethod = console[methodName].bind(console)
		originalMethods.set(methodName, originalMethod)

		console[methodName] = function captureAndForward(...loggedArguments: unknown[]): void {
			publishEvent({
				source: 'user',
				level: CONSOLE_METHOD_LEVELS[methodName],
				title: formatTitle(loggedArguments),
				data: loggedArguments.map(serializeConsoleArgument),
			})
			originalMethod(...loggedArguments)
		}
	}

	return function restoreConsole(): void {
		for (const [methodName, originalMethod] of originalMethods) {
			console[methodName] = originalMethod
		}
	}
}

/** Run a prepared script as the body of an async function whose parameters are its globals. */
export async function executeScript(params: ExecuteScriptParams): Promise<void> {
	const globalNames = Object.keys(params.globals)
	const globalValues = Object.values(params.globals)
	const script = new AsyncFunction(...globalNames, params.source)

	const restoreConsole = captureConsole()
	try {
		await script(...globalValues)
	} finally {
		restoreConsole()
	}
}
