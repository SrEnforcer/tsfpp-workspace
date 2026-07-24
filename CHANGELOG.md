# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed

- Widened the `@tsfpp/standard` dependency range to `^2.0.0` so the server serves the standard's 2.0.0 ruleset (Rules 1.13, 1.14, 4.6, 6.7, 7.8, 8.5). The previous `^1.4.0` caret excluded 2.0.0.

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
