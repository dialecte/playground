# Dialecte playground

Load an XML file, run TypeScript against it with a [Dialecte](https://dialecte.github.io/core/) SDK,
and see what really happened: the XML before and after, and a console reporting every stage.

SCL (`@dialecte/scl`) is built in. A dialecte you are developing on your machine can be plugged into
the dev server and hot-reloaded while you edit it.

```sh
npm install
npm run dev
```

## Writing a script

The playground owns the project and the loaded file, and puts them in scope:

| Global       | What it is                                                               |
| ------------ | ------------------------------------------------------------------------ |
| `project`    | the project the playground opened                                        |
| `doc`        | the loaded file: `doc.query`, `doc.transaction(...)`, `doc.prepare(...)` |
| `documentId` | its identifier inside the project                                        |
| `dialecte`   | everything the active dialecte exports                                   |
| `helpers`    | type guards and converters from `@dialecte/core/helpers`                 |
| `utils`      | `invariant`, `formatXml`, ... from `@dialecte/core/utils`                |

A script is type-checked against the active dialecte and compiled before it runs, so type
annotations are fine and a type error blocks the run. Top-level `await` works; `import` does not -
use the globals. `Ctrl/Cmd + Enter` runs, `Ctrl/Cmd + O` opens a file, `Ctrl/Cmd + S` saves it,
`Ctrl/Cmd + Z` undoes the last change outside the editor.

More snippets: [src/assets/examples.md](src/assets/examples.md).

### Preview

With **Preview** ticked, the first `doc.transaction(...)` of a script is staged instead of committed
and the script stops there. The console shows what it would create, update and delete; **Commit**
applies it, **Discard** drops it. A script that opens its own document through
`project.openDocument` goes around the preview and commits for real.

## The console

One chronological log; the tabs are filtered views of it.

| Source      | Reports                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `lifecycle` | project opened / closed / destroyed, dialecte plugged / reloaded                     |
| `io`        | import (record count, duration), export                                              |
| `channel`   | every message on the project's `BroadcastChannel`                                    |
| `state`     | an operation starting and settling, two-level progress as a single row               |
| `history`   | commits with their label, undo, redo                                                 |
| `preview`   | a staged transaction and what became of it                                           |
| `problem`   | type errors, structured Dialecte errors (key, code, method, element), runtime errors |
| `user`      | `console.*` output - of the script and of the dialecte code it calls                 |
| `run`       | start, and a summary: duration, commits, XML lines added and removed                 |
| `perf`      | the perf report, when the dialecte's project has its dev perf switch on              |

`Data` on a row shows its structured payload. The log survives a page reload, not the tab.

### Reading it from an agent

The same log is available as data, so an agent driving the browser does not scrape the page:

```js
await window.__DIALECTE_PLAYGROUND__.whenIdle() // no run, no document operation in flight
window.__DIALECTE_PLAYGROUND__.getEvents({ sinceId }) // copies of the events logged after an id
window.__DIALECTE_PLAYGROUND__.getState() // dialecte, document, run status, current and previous XML
```

Every call returns a copy; nothing can be changed through it.

## Plugging a local dialecte

```sh
DIALECTE_LOCAL=../my-dialecte npm run dev
```

The dialecte is loaded from its source and hot-reloaded while you edit it. Dev server only. The full
guide - scaffolding one with `@dialecte/create`, installing it, growing it with extensions,
troubleshooting - is built in: **Help > Set up a local dialecte**. Its source is
[src/assets/docs/local-dialecte.md](src/assets/docs/local-dialecte.md).

## Layout

Code is grouped by domain, and layered inside each: plain `.ts` and `*.service.ts` files talk to
Dialecte and the editor and hold no reactive state; `*.store.ts` and `*.composable.ts` hold the
reactive state and never import Dialecte; components only render.

| Folder                  | Owns                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `src/dialecte-registry` | which dialectes are available, detection, the local plug           |
| `src/workspace`         | project and document lifecycle, import / export, undo / redo       |
| `src/runner`            | type-check, compile, execute, preview, run summary                 |
| `src/console`           | the event log, its views, the agent bridge                         |
| `src/editor`            | Monaco setup, per-dialecte type libraries, the two editors         |
| `src/documentation`     | the built-in guides: markdown pages, their rendering, the dialog   |
| `src/shell`             | layout, menu, shortcuts                                            |
| `src/plugins`           | Vite plugins: type collection, importer-aware `@/`, the local plug |

```sh
npm run test    # unit tests
npm run check   # type-check, lint, format
npm run build
```
