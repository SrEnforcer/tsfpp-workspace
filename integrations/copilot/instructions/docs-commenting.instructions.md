

applyTo: "**/*.ts,**/*.tsx,**/prelude/**/*.ts,**/prelude/*.ts"
---

# General Principles (Stack Overflow Wisdom)

- Comments must add value beyond what the code already expresses. Do not duplicate the code in comments.
- Good comments do not excuse unclear, confusing, or poorly named code. Refactor unclear code instead of explaining it.
- If you cannot write a clear comment, the code itself may need to be rewritten for clarity.
- Comments should clarify, not confuse. Avoid cryptic, clever, or joke comments that obscure intent.
- Explain unidiomatic, surprising, or non-obvious code—especially if it may be "simplified" by a future reader.
- Always provide links to the original source when copying code from external sources (e.g., Stack Overflow, RFCs, tutorials). This provides context and proper attribution.
- Include links to external references (standards, docs, issues) where they help future readers understand the rationale.
- Add comments when fixing bugs, describing the issue, workaround, and (if possible) a reference to the tracker or issue number.
- Use comments to mark incomplete implementations or technical debt (TODO, FIXME, etc.), following the standard format.

> "Code tells you how, comments tell you why." — [Jeff Atwood](https://blog.codinghorror.com/code-tells-you-how-comments-tell-you-why/)
# Commenting & Annotation Standard (TSF++)

## JSDoc Documentation
- Every exported symbol MUST have a JSDoc block covering:
  - Purpose and intent
  - Preconditions and invariants
  - Return semantics (including error/option types)
  - For combinators: algebraic laws (identity, associativity, etc.)
- JSDoc goes immediately above the symbol.
- Module headers should describe the module’s purpose, main types, and any architectural notes or deviations.
- For deviations from the coding standard: use an inline comment:
  `// DEVIATION(N.M): <one-line justification>`
  and, if project-wide, add to `DEVIATIONS.md`.

### Example JSDoc
```typescript
/**
 * Returns the area of a shape.
 * @param shape - The shape to compute area for.
 * @returns The area as a number.
 * @law Identity: area({ kind: 'rect', width: 1, height: 1 }) === 1
 */
export const area = (shape: Shape): number => { ... }
```

## Code Reminders (TODO, FIXME, etc.)
- Standard tags: TODO, FIXME, HACK, NOTE, OPTIMIZE, BUG, XXX
- Format: Always include date, author/initials, and (if possible) a ticket/issue reference:
  ```typescript
  // TODO(2026-04-20, @alice, #123): Refactor to use Option instead of undefined
  // FIXME(2026-04-20, @bob): Handle null input (see issue #456)
  // HACK(2026-04-20, @carol): Hardcoded value, remove after v2.0
  ```
- Best practices:
  - Keep reminders actionable and specific.
  - Link to issues/tickets for tracking.
  - Regularly review and resolve reminders.
  - Use tools like VS Code Todo Tree to track and manage reminders.

## Do’s and Don’ts
- Do: Use JSDoc for all exports, document algebraic laws, use code reminders with metadata, remove reminders when addressed.
- Don’t: Leave vague comments, use reminders without context, let TODOs/FIXMEs linger for months.
