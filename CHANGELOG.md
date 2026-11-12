# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UNRELEASED]

### Changed

- Updated to `@dialecte/core` 0.10 and `@dialecte/scl` 0.16. A Save File that fails now shows in the Problems view; the saved file keeps each text value on its element's line.

## [0.2.0] - 2026-09-29

### Added

- One console for every stage: a single log with All, Output, Activity and Problems views.
- Preview: a run can stage its first transaction, show what it would change, and let you commit or discard it.
- Plug a dialecte you are developing: `DIALECTE_LOCAL=../my-dialecte npm run dev`.
- A read-only surface for browser agents: `window.__DIALECTE_PLAYGROUND__`.
- A built-in guide to set up a local dialecte (Help > Set up a local dialecte).
- Scripts may use type annotations.
- A Dialecte menu when more than one dialecte is available.

### Changed

- Scripts get `project`, `doc`, `documentId`, `dialecte`, `helpers` and `utils` in scope and no longer open their own document; `openSclDocument`, `importSclFiles`, `exportSclFile` and `DATABASE_NAME` are gone.
- Updated to `@dialecte/core` 0.5 and `@dialecte/scl` 0.4.
- Progress shows one row per run.
- The XML diff compares the file before and after a run, however many transactions it committed.
- Undo and Redo are enabled when there is something to undo or redo.
- The file dialog accepts the extensions the active dialecte declares.

### Fixed

- A type error in a script is reported on its line.

## [0.1.3] - 2026-05-07

## Changed

- Update to latest `SCL` and `Core` dialecte version

## [0.1.2] - 2026-03-11

## Changed

- Update to latest SCL dialecte version

## [0.1.1] - 2026-03-11

## Changed

- Starting example changed to `findChildren` to `findDescendants`

## [0.1.0] - 2026-03-11

## Changed

- Reboot - migration to Dialecte 0.1.0 (no chain API)

## [0.0.3] - 2026-02-25

### Fixed

- Open and save shortcuts
- Console log use in the editor

## [0.0.2] - 2026-02-25

### Changed

- Scl Dialecte version update

## [0.0.1] - 2026-02-25

### Added

- Init
