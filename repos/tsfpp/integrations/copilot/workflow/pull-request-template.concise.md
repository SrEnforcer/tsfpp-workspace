## Description

Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context.

## Functional Checklist (CODING_STANDARD.md)

Agents and Humans, please verify the following before submitting or merging:

- [ ] I have strictly adhered to the `CODING_STANDARD.md`.
- [ ] My code logic remains purely functional (core) and side-effects are isolated to IO boundaries.
- [ ] No `throw` statements have been used. Partial/fallible functions return total unions (`Result` / `Option`).
- [ ] Ramda pipelining and combinators have been preferred over imperative iteration.
- [ ] All exported functions and types contain comprehensive, up-to-date JSDoc.
- [ ] Code has been verified not to contain ad-hoc `console.log` statements.
- [ ] Tests (`pnpm test` / `pnpm build`) pass successfully.

## Notes for Reviewer

(Provide any specific details the reviewer should pay attention to, highlighting any algorithmic choices or algebraic data structure changes.)
