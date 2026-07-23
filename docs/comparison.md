# TSF++ Comparison

TSF++ is a coding standard plus reference packages. It is not a replacement runtime.

## Quick positioning

| Project | Primary goal | TSF++ relationship |
|---------|--------------|--------------------|
| fp-ts | Functional programming typeclass toolkit | Compatible; TSF++ can adopt selected fp-ts patterns |
| Effect | Typed effect runtime and ecosystem | Compatible; TSF++ constrains style, Effect provides runtime semantics |
| Ramda | Functional utility library | Used by prelude as curated functional building blocks |
| Airbnb style guide | General JS/TS style conventions | Different scope; TSF++ focuses on correctness constraints |
| Google TS style guide | Broad team-wide consistency | Complementary; TSF++ is stricter on mutability and effects |

## What TSF++ adds

- Explicitly forbidden constructs based on defect-prone patterns
- Mandatory exhaustive matching and totality-oriented design
- Effect boundaries modeled in types (`Result`, `Option`, typed async errors)
- Machine-enforced immutability and functional control flow

## Trade-offs

Benefits:

- Lower hidden runtime risk
- More predictable review outcomes
- Better refactoring safety in large codebases

Costs:

- Higher initial onboarding effort
- More upfront type modeling
- Potential friction with legacy or framework-heavy code

## Selection guidance

Choose TSF++ when correctness and long-term maintainability matter more than rapid prototyping speed.

Avoid strict TSF++ in early exploratory spikes or throwaway prototypes unless the team accepts the ceremony cost.
