# Rationale: §8 — Partiality, Totality, and Proof

Covers Rules 8.1–8.4 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 8.1 — Every function must be total or document partiality in the return type

**What is a total function?**

A total function returns a value for every value in its input domain. A partial function either diverges (loops forever), crashes (throws), or has no defined output for some inputs (e.g., `head([])` returning `undefined` on an empty array).

Partiality is not inherently wrong — the real problem is *unannounced* partiality. A function that may return nothing should signal this in its return type so callers are forced to handle both cases.

**TSF++ encoding of partiality:**

| Situation | Return type | Example |
|-----------|-------------|---------|
| Value may not exist | `Option<A>` | `findUser(id): Option<User>` |
| Operation may fail | `Result<T, E>` | `parseJson(raw): Result<Config, ParseError>` |
| Either absent or failed | `Option<Result<T, E>>` | rare, usually avoidable by design |

**Why not `T | undefined`?**

`undefined` is a value, not a type-level signal. `Option<T>` is a discriminated union with `_tag: 'Some' | 'None'`, which integrates with pattern matching and chainable combinators. A function returning `T | undefined` requires an `!== undefined` check; a function returning `Option<T>` requires an exhaustive `switch` or a `map` — both more compositional patterns.

**The `head` example:**

```typescript
// Partial — returns undefined silently
const head = <A>(xs: A[]): A => xs[0]!

// Total — partiality is typed
const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0 ? some(xs[0]!) : none
  // DEVIATION(1.6): `!` safe here — guarded by xs.length > 0 check
```

The `!` in the total version is a legitimate deviation: the guard proves the array is non-empty, so `xs[0]` is defined. The deviation comment documents this reasoning.

---

## Rule 8.2 — Property-based testing with fast-check for all pure core functions

**What property-based testing is:**

Property-based testing generates hundreds of random inputs and checks that a stated *property* holds for all of them. Instead of asserting "tokenize('hello') returns ['hello']", you assert "tokenize(s).join('') equals s for all strings s" (roundtrip property).

**Why it is mandatory for core functions:**

Example-based tests verify the specific inputs you thought of. Property-based tests find the inputs you did not think of — edge cases at boundaries, unexpected Unicode, extreme lengths, adversarial inputs.

For parser combinators, layout algorithms, and data transformations, the expected behavior is often expressible as a law (identity law, roundtrip law, associativity). Encoding this law as a property test is more complete and more maintainable than maintaining dozens of example inputs.

**The laws to test:**

| Combinator type | Laws to check |
|----------------|---------------|
| Identity combinators | `pipe(f, identity) ≡ f` |
| Inverse pairs | `decode(encode(x)) ≡ ok(x)` (roundtrip) |
| Monoid | `mappend(mempty, x) ≡ x` (identity) |
| Associative operations | `op(op(a, b), c) ≡ op(a, op(b, c))` |
| Monotone functions | `x ≤ y → f(x) ≤ f(y)` |

**`fast-check` specifically:**

`fast-check` has excellent TypeScript support and provides:
- Built-in arbitrary generators for all primitive types
- Shrinking: when a failing input is found, it automatically minimizes it to the smallest failing example
- Composable arbitrary combinators for building domain-specific generators

---

## Rule 8.3 — Document algebraic laws as JSDoc

**Why document laws, not just behavior?**

Laws are stronger than behavior descriptions. "Returns a sorted array" is a behavior description. "Idempotent: `sort(sort(xs)) ≡ sort(xs)`" is a law. The law can be machine-checked; the behavior description cannot.

Documenting laws also signals to readers that the combinator is designed to compose:

```typescript
/**
 * pipe(f, identity) ≡ f           (right identity)
 * pipe(identity, f) ≡ f           (left identity)
 * pipe(pipe(f, g), h) ≡ pipe(f, pipe(g, h))  (associativity)
 *
 * @param fns - Sequence of unary functions to compose left-to-right.
 */
```

A reader who knows category theory reads these laws and immediately understands that `pipe` is a monoid on endofunctions. A reader who does not still benefits: the examples show that `identity` is a no-op in any position, which is a useful and non-obvious fact.

**Where laws come from:**

Most functional combinators correspond to well-known algebraic structures (monoids, functors, monads). You do not need to invent laws — you need to verify that your combinator satisfies the standard laws for its structure. The Haskell `Typeclassopedia` and Bartosz Milewski's "Category Theory for Programmers" are canonical references.

---

## Rule 8.4 — Parse, don't validate

A validator that returns `boolean` answers only "yes/no" and leaves the original `unknown` unchanged. Callers then re-check, cast, or accidentally pass raw shapes deeper into the core.

A parser returns typed data (or typed error). This makes boundary processing single-pass and explicit:

- Boundary layer: parse `unknown` to `Result<DomainType, ParseError>`.
- Core layer: consume `DomainType`, never raw input shapes.

This reduces duplicated checks and improves local reasoning. Every function after the parse boundary can rely on domain invariants by construction.

---

## Rule 8.5 — Total eliminators over hand-rolled guards

A guard and a `match` both let you handle both variants of an `Option` or `Result`. Only one of them *forces* you to.

```typescript
// Guard: the None arm is optional as far as the compiler is concerned
const label = isSome(name) ? name.value : /* nothing here still type-checks in many shapes */

// match: both handlers are required by the type, and both must return B
const label = matchOption(() => 'anonymous', (n: string) => n)(name)
```

`matchOption(onNone, onSome)` and `matchResult(onErr, onOk)` are eliminators: their type demands a handler per variant and a common result type, so a missing arm is not a review-catchable oversight but a compile error. That is axiom 5 (exhaustiveness) applied to the two-variant prelude ADTs, in the same spirit as the `never` assertion for n-ary unions. A second benefit falls out for free: the discriminant never appears at the call site, so Rule 1.11 is satisfied by construction rather than by discipline.

The rule is a `SHOULD`, not a `MUST`, because guards are genuinely better for one shape: early-return control flow. When the intent is "bail out of the whole function on `None`, then proceed on the golden path" (Rule 4.4), a guard clause keeps the happy path unindented and reads more directly than a `match` whose `onSome` would swallow the rest of the body:

```typescript
const process = (input: Option<string>): Result<Output, Err> => {
  if (isNone(input)) return err('missing input')   // leave the function
  return ok(transform(input.value))                // golden path, not nested
}
```

The dividing line: if both arms *produce a value* that the surrounding expression consumes, reach for the eliminator; if one arm *exits* and the other continues, keep the guard.
