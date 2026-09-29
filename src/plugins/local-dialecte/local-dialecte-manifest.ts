import type { DialectePackageJson, LocalDialecteManifestResult } from './local-dialecte.types'

const CORE_PACKAGE_NAME = '@dialecte/core'
const SUBPATH_PREFIX = './'
const TEST_ENTRY_SUFFIX = '/test'

function isVersionEntry(exportKey: string): boolean {
	return exportKey.startsWith(SUBPATH_PREFIX) && !exportKey.endsWith(TEST_ENTRY_SUFFIX)
}

/**
 * A scaffolded dialecte exposes one entry per schema version (`./v1`), built from the matching
 * source folder. Reading that entry from its package.json is enough to load the package from
 * SOURCE, without it ever being built.
 */
export function readLocalDialecteManifest(params: {
	packageJson: DialectePackageJson
	packageRoot: string
}): LocalDialecteManifestResult {
	const { packageJson, packageRoot } = params

	if (packageJson.name === undefined) {
		return { isReadable: false, reason: 'its package.json has no name' }
	}

	const versionEntry = Object.keys(packageJson.exports ?? {}).find(isVersionEntry)
	if (versionEntry === undefined) {
		return {
			isReadable: false,
			reason: 'its package.json exports no version entry such as "./v1"',
		}
	}

	const versionFolder = versionEntry.slice(SUBPATH_PREFIX.length)
	const sourceRoot = `${packageRoot}/src`

	return {
		isReadable: true,
		manifest: {
			packageName: packageJson.name,
			packageVersion: packageJson.version ?? '0.0.0',
			versionFolder,
			packageSpecifier: `${packageJson.name}/${versionFolder}`,
			packageRoot,
			sourceRoot,
			sourceEntry: `${sourceRoot}/${versionFolder}/index.ts`,
			coreRange: packageJson.dependencies?.[CORE_PACKAGE_NAME] ?? null,
		},
	}
}
