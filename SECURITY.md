# Security Policy

## What this file means

This project publishes a coding standard and reference tooling. Security reports
are still important, especially for:

- Published packages under the `@tsfpp/*` namespace
- Workflow automation in `.github/workflows/`
- Template or integration files that could introduce unsafe defaults

## Supported versions

Security fixes are generally applied to the latest release line only.

| Component | Supported |
|-----------|-----------|
| `spec/` (standard text) | Latest on `main` |
| `@tsfpp/prelude` | Latest major |
| `@tsfpp/eslint-config` | Latest major |
| `@tsfpp/tsconfig` | Latest major |

## Reporting a vulnerability

Please do not open public issues for suspected vulnerabilities.

Preferred channel:

1. Open a private GitHub Security Advisory for this repository when available.
2. Include a clear description, impact, and reproduction steps.
3. If possible, include a minimal proof of concept.

If private advisories are unavailable for your account, contact the repository
owner through GitHub profile contact and include `[SECURITY]` in the subject.

## Response expectations

As this is a maintainer-led open project, response times are best effort.
Target expectations:

- Initial acknowledgment: within 7 days
- Triage decision: within 14 days
- Fix timeline: depends on severity and maintainer availability

## Disclosure policy

- Please allow reasonable time for investigation and remediation before public disclosure.
- After a fix is available, a public advisory and changelog entry will be published.
- Credit will be given to reporters unless anonymity is requested.

## Scope notes

Out of scope unless they demonstrate a concrete security impact:

- Purely stylistic disagreements with TSF++ rules
- Theoretical language-level issues in TypeScript itself
- Vulnerabilities in third-party dependencies with no exploit path through this project
