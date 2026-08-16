# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed

- Widened the `@tsfpp/standard` dependency range to `^5.0.0` so the server serves the current ruleset, including Rule 1.15. This entry previously claimed `^2.0.0` while `package.json` had already moved to `^4.0.0` — the range has been raised twice since without the changelog following. Rule 1.15 is verified to parse into the rule index (75 rules, `level=MUST`).

### Known issues — this package is not currently publishable

Both found while verifying the Rule 1.15 work; neither is fixed yet, because the package has no installed `node_modules` (its dependencies were unpublished at the time) and so its typecheck, lint, and tests could not be run.

- **The source does not compile against its own declared dependency range.** `rule-index.ts` and `package-reader.ts` pipe `Option` values into `getOrElse`, which has been the **`Result`** eliminator since `@tsfpp/prelude` 2.0.0 (`getOrElseOption` is the `Option` one). There are 8 such call sites, against a declared range of `^2.0.2` — so no version in the permitted range type-checks.
- **`list_forbidden` returns zero constructs.** It scans for a `## Never` section that exists in no spec file, and even if lines reached it, a hardcoded 5-entry `forbiddenMetadata` whitelist would drop 22 of the 27 rows in the standard's section 12 table. Its test passes because it feeds `listForbidden` a hand-built index with fabricated constructs, so the failure is invisible in CI. Parsing the section 12 table directly yields all 25 rows with real rule IDs and alternatives — prototyped against the real spec, not yet shipped — and would also remove `forbiddenMetadata` as a duplicated source of truth.

Since `@tsfpp/standard` is a **runtime** dependency here (the server reads spec files from the installed package), the range change above is consumer-facing and will need a version bump whenever these two issues are resolved and the package is published again.

## [1.0.3] - 2026-07-24

### Changed

- Updated TSF++ internal dependency references to the current published releases, including `@tsfpp/eslint-config` 1.0.3.

## [1.0.2] - 2026-07-24

### Changed

- Updated TSF++ internal dependency references to the current published releases.

## [1.0.1] - 2026-05-29

### Updated

- Prelude updated, added explicit versions, `toObject` and `isDefined`

## [1.0.0] - 2026-05-28

### Added

- Initial implementation of @tsfpp/mcp-server.
- TSF++ rule indexing and MCP tool/resource registration.
- Strict TSF++ lint/typecheck/test setup.
- Release-please manifest configuration and workflow.
