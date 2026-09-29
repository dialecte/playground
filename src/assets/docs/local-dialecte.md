# Set up a local dialecte

Build a dialecte on your machine, load a file with it, and watch what really happens - while you
edit it. The playground loads your dialecte **from its source**: nothing to build, and an edit reaches
the page as a hot update.

> **Dev server only.** On the deployed site this page is a guide, nothing more. Get the playground with
> `git clone https://github.com/dialecte/playground`, run `npm install` there, then follow the steps below.

## Before you start

- Node 20.19 or newer (or 22.12+).
- An XSD schema for the XML you want to work with.
- The playground checked out, with its dependencies installed (`npm install`).

## 1. Create the dialecte

`@dialecte/create` reads the schema and scaffolds a package: definitions generated from the XSD, a
project factory, test helpers and documentation.

```sh
npm create @dialecte -- ./my-schema.xsd --name @acme/widget --out ../widget
```

The `--` is required: without it npm keeps the flags for itself. Options worth knowing:

| Option                   | Default                      | Meaning                                                            |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------ |
| `--name <pkg>`           | `@dialecte/<schema name>`    | package name; its last part becomes the id (`widget`)              |
| `--out <dir>`            | `./<id>`                     | where the package is written                                       |
| `--version <vN>`         | `v1`                         | name of the version folder under `src/`                            |
| `--namespace <uri>`      | the root element's namespace | default XML namespace                                              |
| `--core-version <range>` | `^0.5.0`                     | `@dialecte/core` range the package asks for                        |
| `--root <element>`       | none                         | the element that starts a document, when the schema offers several |

The name decides every identifier: `@acme/widget` gives `createWidgetProject`, `WIDGET_DIALECTE_CONFIG`
and the `Widget` namespace of types.

## 2. Install it

```sh
cd ../widget
npm install
npm run format:fix
npm run check
```

`npm install` is not optional, even though the playground does the loading: the dialecte's own
dependencies must be there. `format:fix` is worth running once, because names of any length are
substituted into the template. `check` type-checks, lints and checks the format.

## 3. Plug it into the playground

From the playground folder, start the dev server with the path of the dialecte:

```sh
DIALECTE_LOCAL=../widget npm run dev
```

Or put `DIALECTE_LOCAL=../widget` in a `.env.local` file next to the playground's `package.json`, and
run `npm run dev` as usual. The path is relative to the playground, or absolute. It is read when the
server starts: to point at another dialecte, restart.

## 4. What you should see

- The header shows your dialecte, marked `local`, and a **Dialecte** menu appears to switch between it
  and the built-in SCL.
- The **Console** logs `Dialecte @acme/widget v1 plugged`, with the number of source files it found.
- File > Open accepts the extensions your dialecte declares (`.xml` unless you changed it).
- The script editor is typed against your dialecte: element names, attributes, allowed children,
  and every method its extensions add.

Each dialecte has its own browser database (`playground::widget`) and its own script, so switching
never mixes them up. Reset only clears the active one.

## 5. Grow it

Change the code and save. The console says `Dialecte ... reloaded`, the project is reopened on the
new code, and the file you loaded is still there. Changing only types refreshes the editor and leaves
the project alone. Neither reloads the page.

An extension adds methods to `doc.query` and to a transaction. One file, one function:

```ts
// src/v1/extensions/items/query/count-items.ts
import type { Config } from '@/v1/config'
import type * as Core from '@dialecte/core'

export async function countItems(query: Core.Query<Config>): Promise<number> {
	const root = await query.getRoot()
	const { Item: items } = await query.findDescendants(root, { collect: 'Item' })
	return items.length
}
```

Group it in a module and register the module:

```ts
// src/v1/extensions/items/index.ts
import * as itemsQueries from './query'

export const items = { query: itemsQueries }
```

```ts
// src/v1/extensions/index.ts
import { items } from './items'

const WIDGET_EXTENSION_MODULES = { items }

export { WIDGET_EXTENSION_MODULES }
```

The first parameter is dropped when the method is bound, so in the playground it reads:

```ts
const count: number = await doc.query.items.countItems()
```

Type the first parameter with `Core.Query<Config>` (or `Core.Transaction<Config>`), never with the
hydrated `Widget.Query`: that type is built from the extensions themselves, and using it inside one
makes a cycle.

Write the test first. Test helpers are generated in `src/v1/test`, and `npm run test` runs them in a
browser (`npx playwright install chromium` once, if it complains that the browser is missing).

## Working with an AI agent

The playground cannot host an assistant, but it can be driven from outside. Let an agent such as
Claude Code edit the dialecte's files with tests first, while the playground reloads. To read what
happened, the agent uses a read-only surface on the page:

```js
await window.__DIALECTE_PLAYGROUND__.whenIdle() // no run, no document operation in flight
window.__DIALECTE_PLAYGROUND__.getEvents({ sinceId }) // the console, as data
window.__DIALECTE_PLAYGROUND__.getState() // dialecte, document, run status, current and previous XML
```

## How a dialecte is recognized

The playground finds the dialecte from what its package exports, so it needs no configuration. It
must have:

- an entry per version in the `exports` of its `package.json`, such as `./v1` (a `./v1/test` entry
  is ignored), backed by `src/v1/index.ts`;
- exactly one exported function named `create<Name>Project`;
- exactly one exported config object, with a `rootElementName` and a `definition`.

A scaffolded package has all three.

## Troubleshooting

| What you see                                                                                             | Why, and what to do                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The page stays blank, the dev server logs `failed to resolve "extends":"@tsconfig/node24/tsconfig.json"` | The dialecte's dependencies are not installed. Run `npm install` in its folder.                                                                                                                                                                                                                                                                                                                                                                                   |
| The console says `... cannot be plugged` followed by a reason                                            | The package does not meet the three conditions above. The reason names which.                                                                                                                                                                                                                                                                                                                                                                                     |
| A warning says the dialecte `asks for @dialecte/core ^x but runs on the playground's y`                  | Expected: the dialecte always runs on the playground's copy of the engine, because two copies would not share a project. Align the range in its `package.json` to remove the warning.                                                                                                                                                                                                                                                                             |
| `Property 'items' does not exist on type 'Query<...>'` in the editor                                     | The module is not registered in `src/v1/extensions/index.ts`; or the method types its first parameter with the hydrated `Query`; or the package was scaffolded by an old `@dialecte/create` (0.0.3 or before), whose `Project` type merged the extensions twice: in `src/v1/config/hydrated.types.ts`, give `Project` the raw modules, `Core.Project<Config, WidgetModules & GenericCustomModules>`, with `type WidgetModules = typeof WIDGET_EXTENSION_MODULES`. |
| Nothing changes after editing `DIALECTE_LOCAL`                                                           | It is read at start. Restart the dev server.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| No **Dialecte** menu                                                                                     | It appears when there are two or more dialectes. None is plugged: check the server was started with `DIALECTE_LOCAL`.                                                                                                                                                                                                                                                                                                                                             |
| A dependency you just added is not found                                                                 | Restart the dev server.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm run test` fails with `Executable doesn't exist`                                                     | Install the browser it drives: `npx playwright install chromium`.                                                                                                                                                                                                                                                                                                                                                                                                 |
