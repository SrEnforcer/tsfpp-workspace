# TSF++ Philosophy

## Origin

TSF++ adapts the philosophy of three proven high-assurance traditions: Lockheed Martin's JSF++ C++ standard, NASA JPL's Power of Ten rules (Holzmann), and the ML/Haskell school of algebraic data types and total functions.

The standard was drafted with substantial AI assistance and curated, reviewed, and refined through real project adoption. It reflects deliberate design choices about what makes TypeScript code provably correct, auditable, and resilient to the most common defect vectors in production systems.

## Core axioms

### 1. Correctness by construction

The primary goal is to make illegal states unrepresentable in the type system. If a value cannot exist in an illegal state, you cannot write code that creates one, no matter how careless you are.

This inverts the traditional testing pyramid: instead of writing tests to catch bugs *after* they happen, you structure the type system so large categories of bugs *cannot happen at all*.

**Consequence:** Type narrowing, not runtime checks. Exhaustive matching, not boolean guards.

### 2. Totality

Every function must have an output for every legal input. Partiality (functions that crash, throw, or loop forever on valid input) is a hidden control-flow vector that reviewers cannot cheaply detect.

**Consequence:** No partial functions. Use `Option<T>` for "no value," `Result<T, E>` for "might fail," never `null` or `throw` in the middle of a pipeline.

### 3. Immutability

Mutable state is temporal coupling. If an object can change after creation, every alias to it becomes a potential source of surprise.

**Consequence:** Data is values, not objects. Use `const`, discriminated unions, and recursive structures. No `let` within a function body.

### 4. Referential transparency

A function's output should depend only on its inputs. If you call a function twice with the same arguments, you should get the same result. Hidden dependencies (globals, side effects, time) are not.

**Consequence:** Immutable inputs, pure outputs, explicit side effects at the boundary. No class instance state, no `this`, no ambient context.

### 5. Exhaustiveness

The compiler should enforce that you have handled every case. Silently falling through on an unanticipated case is a common defect.

**Consequence:** Discriminated unions with exhaustive `switch` / pattern matching. No generic `any`, no silent fallthroughs.

## Why these rules work together

Each axiom alone is useful. Together, they create a virtuous cycle:

- **Totality + Immutability** → No temporal coupling, no hidden state transitions
- **Referential Transparency + Immutability** → Side effects are localized and visible
- **Exhaustiveness + Type Narrowing** → No casts, no guards, no dead code paths
- **Immutability + Correctness by Construction** → Type changes propagate compile-time errors, not runtime surprises

A team adopting TSF++ pays upfront: more deliberate type design, explicit error handling, fewer quick shortcuts. But they earn:

- Fewer defects that survive code review
- Cheaper debugging (fewer surprise state changes)
- Safer refactoring (type system catches more mistakes)
- Easier onboarding (rules are mechanical, not fuzzy)

## The cost model

**For prototyping and scripting:** TSF++ is overkill. Skip it.

**For systems where defects are expensive** (financial, medical, long-lived, or shared by many teams): The upfront cost in type design pays dividends in reduced defect escape, safer refactoring, and cheaper audits.

The trade-off is explicit: you sacrifice some syntactic convenience and the ability to move fast and break things. You gain assurance.

## Relationship to other approaches

### Versus "just write tests"

Testing catches bugs *after* you ship them. TSF++ aims to prevent whole categories of bugs from being shippable in the first place. Tests and TSF++ are complementary, not competing.

### Versus "type gradual adoption"

TypeScript's `any` and non-null assertions (`!`) are escape hatches designed for gradual adoption from JavaScript. TSF++ rejects them outside of smart-constructor boundaries because they defeat the primary goal: correctness by construction.

If you need gradual adoption, TSF++ is not the right tool for that phase. If you have the luxury of designing from scratch or refactoring incrementally, TSF++ removes the escape hatches and makes you commit to totality.

### Versus "just use a linter"

Linters catch style and some logic errors. TSF++ uses linting as one layer of enforcement, but the real power comes from *type-driven design*: structuring your data so illegal states are impossible. A linter cannot do that.

### Versus domain-specific solutions (Effect-TS, fp-ts, Zod)

These are *libraries* that help you implement TSF++ patterns. They are not competitors:

- **Effect-TS** provides structured concurrency and error handling (implements TSF++'s constraints on `throw` and side effects)
- **fp-ts** provides algebraic data types and functional combinators (implements TSF++'s constraints on totality and referential transparency)
- **Zod** provides runtime schema validation (complements TSF++'s compile-time constraints at system boundaries)

You can adopt TSF++ without any of them. But all three integrate naturally with TSF++ patterns.

## Design decisions

### Why algebraic data types, not objects?

Objects blur data and behavior. ADTs (discriminated unions + constructors) make data structure explicit and make exhaustive handling mechanical. The compiler can prove you have covered every case.

### Why no `throw`?

`throw` is invisible control flow. At a glance, you cannot tell if a function can crash. Error types (`Result<T, E>`) make failure explicit in the signature.

### Why no `class` / `this`?

`this` binding is a source of subtle bugs. Prototype-based inheritance couples identity with equality. Functions and data are clearer when separate.

### Why no `let` / `var`?

Variables that are reassigned create temporal coupling: the value changes over time, and aliases to the binding see different values at different points. Immutable `const` and recursion are clearer.

### Why no `any` / `as` / `!`?

These are escape hatches that put you back in untyped territory. If you need to use them, you should do so deliberately at a boundary (parsing JSON, calling legacy code) inside a smart constructor, not scattered through business logic.

## Adoption strategy

TSF++ is **not** a migration path from untyped JavaScript. If you have a large legacy codebase, incremental adoption is possible but requires careful boundaries.

**Best fit:**

- New projects with functional foundations
- Teams with ML or Haskell experience
- Systems where defects compound (financial, medical, long-lived infrastructure)
- Teams that value type-driven design over "move fast and break things"

**Not a fit:**

- Rapid prototyping where rules feel constraining
- Teams deeply invested in OOP patterns and `class`-based design
- Projects where `throw` and error codes are already baked in
- Organizations where "we've always done it this way" is a blocker to style changes

## Further reading

- [JSF++ Coding Standard](https://www.stroustrup.com/JSF-AV-rules.pdf) — The original high-assurance C++ standard.
- [The Power of Ten (Holzmann)](https://spinroot.com/gerard/pdf/P10.pdf) — JPL's ten rules for reliable systems.
- [Haskell 2010 Language Report](https://www.haskell.org/onlinereport/haskell2010/) — On algebraic data types and total functions.
- [Thinking with Types (Sandy Maguire)](https://leanpub.com/thinking-with-types) — Type-driven design in practice.
