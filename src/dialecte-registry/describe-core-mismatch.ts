const VERSION_NUMBERS = /^[\^~]?(\d+)\.(\d+)\./

function readReleaseLine(version: string): string | null {
	const match = VERSION_NUMBERS.exec(version)
	return match === null ? null : `${match[1]}.${match[2]}`
}

/**
 * A plugged dialecte always runs on the playground's copy of the engine, whatever range it asks
 * for: two copies would not share a project. When the range points at another release line the
 * dialecte may have been written against a different API, which is worth saying out loud.
 */
export function describeCoreMismatch(params: {
	coreRange: string | null
	installedCoreVersion: string
}): string | null {
	const { coreRange, installedCoreVersion } = params
	if (coreRange === null) return null

	const requestedLine = readReleaseLine(coreRange)
	const installedLine = readReleaseLine(installedCoreVersion)
	if (requestedLine === null || installedLine === null) return null
	if (requestedLine === installedLine) return null

	return `it asks for @dialecte/core ${coreRange} but runs on the playground's ${installedCoreVersion}`
}
