# Contributing to TSF++

TSF++ is a curated standard. The maintainer acts as steward — open to good
ideas, but with a high bar for changes that ripple through adopters' codebases.

## What we welcome

- **Rule clarifications** — examples that aren't yet covered, edge cases,
  better wording. Open an issue, propose the diff.
- **Prelude bug reports and small additions** — missing combinators, law
  violations, type-ergonomics improvements.
- **New IDE/agent integrations** — Cursor, Claude Code, Zed, Continue, etc.
  Mirror the structure of `integrations/copilot/`.
- **Adoption reports** — stories of using TSF++ in a real codebase, what
  worked, what didn't. These shape the standard's evolution.

## What requires more discussion

- **New MUST rules** — they affect every adopter. Open an issue first with
  rationale, examples, and the trade-off considered. Don't open a PR cold.
- **Removing or weakening existing rules** — same.
- **Breaking changes to the prelude's ADT shapes or combinator signatures** —
  same. SemVer major bumps are not free.

## Process

1. Open an issue describing the proposal or report.
2. Wait for a thumbs-up or a discussion before sending a PR.
3. PRs follow the trunk-based workflow documented in `workflow/`.
4. The maintainer reviews and merges. There is no formal voting.

If a contributor wants a sustained role, that's a conversation we can have.