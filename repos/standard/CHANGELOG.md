# Changelog - @tsfpp/standard

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [5.0.0] - 2026-07-26

### ⚠ BREAKING CHANGES

- Rule 1.15 reclassifies a construct previously permitted — calling a widening standard-library method on a refined value — so it ships as a major, consistent with 2.0.0, 3.0.0, and 4.0.0.

### Added

- **Rule 1.15** — Preserve a refinement across transformation; never launder it through a widening standard-library method. A refined type earns its keep only while the proof survives: `.map()` on a proven non-empty array returns a plain `ReadonlyArray`, so the proof is discarded on the first transformation and the code that follows *reads* as safe while carrying no guarantee — worse than no refinement, because the type name implies one. The rule binds both sides of the API: consumers must prefer the preserving combinator, and authors of a refined type must ship one for every operation that provably cannot violate the refinement. Operations that genuinely can violate it (a `filter` on a non-empty array) must widen honestly rather than re-assert the proof through `as`.
  - **The standard was violating its own new rule.** `NonEmptyReadonlyArray` had shipped since 1.x with only a guard, a smart constructor, and two accessors — exactly the incomplete shape Rule 1.15 now forbids. Closed by **`@tsfpp/prelude` 2.4.0**.
  - `reduceNonEmpty` is the sharpest justification: `Array.prototype.reduce` without an initial value is *partial* and throws on `[]`. A refinement makes the identical operation total — which a proof that dies at the first `map` never survives long enough to deliver.

### Fixed

- **Rule 8.5 instructed adopters to import an export that does not exist.** Its rationale and worked example both used `matchResult`, while Rule 7.8 makes `Result` the *unsuffixed* base ADT — and Rule 7.8's own rationale cites `matchResult`/`matchOption` as precisely the drift it was written to end. The prelude exports `match`. Corrected in Rule 8.5, `rationale/08-totality-and-proof.md`, and the Appendix E card; the historical mention in `rationale/07-naming.md` is left alone, as it documents the state that was fixed.
- **Three MUST-level constructs were absent from the section 12 forbidden-constructs table**, so a reviewer working from that table alone would have passed them: `===`/`!==` on non-primitives and comparator-less `.sort()` (Rule 4.7, shipped in 4.0.0), import-time side effects (Rule 11.6, shipped in 4.1.0), and Rule 1.15.
- **`release-please-manifest.json` was stale in four of five packages** (`standard` recorded 1.4.0 against a published 4.1.0; `prelude`, `boundary`, and `agents` recorded 2.0.2 against a published 2.1.0). release-please derives the next version from that base, so an automated release would have proposed a version already published — the same class of collision hit manually earlier. All four now record the version actually on npm.

## [4.0.0] - 2026-07-25

### ⚠ BREAKING CHANGES

- Rule 4.7 reclassifies previously-permitted comparisons; ships as a major, consistent with 2.0.0 and 3.0.0.

### Added

- **Rule 4.7** — Never compare non-primitive values with `===`/`!==` expecting structural equality; pass an explicit `Eq<A>`. Covers ordering too (`.sort()` without a comparator sorts by string coercion). `===` stays correct for primitives, branded primitives, and string-literal discriminants.

### Added

- **`spec/examples/reference-service.md`** — a complete worked vertical slice (domain → parse → use case → handler → composition root) for a signup endpoint, showing where every rule lands in a real program. Every code block is type-checked against `@tsfpp/prelude` 2.2.0 under the Rule 9.1 `tsconfig`, compiled, and executed; the documented output is real program output. Demonstrates the `Validation`-vs-`Result` choice (Rule 6.8) side by side in adjacent layers, and the frozen-clock testability that Rule 4.6 buys.

### Changed

- **Self-compliance.** Two live, unrecorded MUST violations in the reference implementation were closed: `@tsfpp/prelude`'s `fp.ts` (1228 lines, past Rule 11.2's 800-line absolute ceiling) was split into focused modules with the public API unchanged, and `@tsfpp/boundary` gained the `fast-check` suite Rule 8.2 requires. The remaining gap (`@tsfpp/mcp-server`) is now recorded as **DEV-002** with a revocation condition and a revisit date, instead of being implicit.
- **PHILOSOPHY.md axioms refreshed.** The five axioms predated six rules; their consequences now name numeric hazards and `satisfies` (axiom 1), tagged error channels and accumulation (axiom 2), the enumerable ambient reads (axiom 4), and total eliminators (axiom 5). The "tests as a substitute for types" rejection gained its corollary: properties the type system cannot express are checked with generated input, not examples.

### Fixed

- **PHILOSOPHY.md** claimed "with immutable values, identity and equality coincide" — true of ML-family languages, **false as written for TypeScript**, where `===` on non-primitives is reference equality. Restated, with a pointer to Rule 4.7.

## [3.0.0] - 2026-07-25

### ⚠ BREAKING CHANGES

- New MUST rule can make previously-compliant validation code non-compliant; ships as a major, consistent with the SemVer policy and with how Rule 6.7 was handled in 2.0.0.

### Added

- **Rule 6.8** — Use `Validation<E, A>` when independent checks must all be reported; reserve `Result` for dependent steps that short-circuit. Includes a decision table and the `validationToResult` / `resultToValidation` seam. Implemented by `@tsfpp/prelude` 2.1.0.

### Changed

- Rule 8.2 (mandatory property-based testing) is now genuinely enforced in the reference implementation: `@tsfpp/prelude` ships a `fast-check` law suite verifying the algebraic laws its `@law` annotations assert. Previously those laws were prose only — an unrecorded violation of this standard's own MUST rule.

## [2.0.0] - 2026-07-23

### ⚠ BREAKING CHANGES

- New MUST rules forbid previously-permitted constructs; adopter code compliant under 1.x may need changes. Per the SemVer policy documented for this standard (a rule change that can break adopters is a major bump), these ship as a major release, alongside `@tsfpp/prelude` 2.0.0 and `@tsfpp/boundary` 2.0.0.

### Added

- **Rule 1.13** — Numeric hazards: `NaN`/`Infinity` and coercion-based parsing forbidden in the core; brand constrained numerics (`Int`/`Positive`/`NonNegative`); guard finiteness at the boundary.
- **Rule 1.14** — Prefer `satisfies` over `as` for literal conformance.
- **Rule 4.6** — No ambient nondeterminism in the pure core (`Date.now`/`new Date`/`Math.random`/`crypto.randomUUID`/`performance.now`/`process.env` are effects — inject via `Deps`).
- **Rule 6.7** — Domain error channels must be `kind`-tagged discriminated unions, never bare `string`/`Error`.
- **Rule 7.8** — ADT-combinator naming: `Result` is the unsuffixed base; other ADTs are suffixed by full type name (`mapOption`, `headNonEmpty`); no abbreviated/single-letter forms.
- **Rule 8.5** — Consume `Option`/`Result` through a total `match` eliminator when both arms yield a value.
- Appendix B: `no-restricted-globals` / `no-restricted-syntax` enforcing Rules 1.13 and 4.6. Appendix E and the review checklist updated.

### Changed

- **Rule 7.3 tightened** — `mk` is the canonical smart-constructor prefix; `create*` is no longer sanctioned.
- Rationale (§1, §4, §6, §7, §8) and rule-by-rule examples added/updated for every new rule.

## [1.4.0] - 2026-05-18

### Added

- Added `spec/CONFIG_CODING_STANDARD.md` for typed configuration loading, validation, and injection rules.
- Added `spec/LOG_CODING_STANDARD.md` for structured logging, logger-port usage, and log safety constraints.

### Changed

- Updated `README.md` standards table and profile hierarchy to include TSF++/Config and TSF++/Log.
- Updated `spec/PHILOSOPHY.md` and `spec/RATIONALE.md` to include conceptual framing and rationale coverage for TSF++/Config and TSF++/Log.

## [1.2.0] - 2026-05-18

### Added

- Added `spec/ANNOTATION_CODING_STANDARD.md` defining annotation and comment governance.
- Added `spec/RATIONALE.md` outlining the choices and considerations behind the TSF++ standard family.

### Changed

- Updated `README.md` to document the latest standard set and refreshed references (including rationale and ecosystem tables).

## [1.1.0] - 2026-05-17

### Added

- `spec/TEST_CODING_STANDARD.md`.
- Companion coverage for Rules `1.10-1.12`, `2.5`, `6.6`, `7.7`, `8.4`, `9.6`, and Section `10.1-10.4`.
- New companion files: tooling and documentation/review examples and rationale.

### Changed

- Synced `spec/examples` and `spec/rationale` coverage with `CODING_STANDARD.md` v1.1.0 additions.
- Renumbered module-organisation example file to align with Section 11.
- Updated stale standard-path references across `spec/` docs and README tables.
- Repaired corrupted content in `spec/rationale/11-module-organisation.md`.

## [1.0.0] - 2026-05-14

### Added

- Initial package scaffold.
- Typed metadata helpers for standard documents and risk levels.
- TS build, lint, and test setup matching sibling TSF++ libraries.