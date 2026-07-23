---
mode: agent
description: "Run the full trunk feature lifecycle with enforced checkpoints: start-work -> implement -> checkpoint(s) -> sync -> open-pr"
---

Execute a strict trunk-based lifecycle for the current task.

Flow:
1. Start gate:
- If current branch is `main`, run the `/git-start-work` procedure before editing files.

2. Implementation phase:
- Execute requested implementation.
- At each logical slice (feature unit, bug fix unit, refactor unit), run `/git-checkpoint`.
- Avoid large mixed commits; split by concern.

3. Integration phase:
- Run `/git-sync` before opening PR.
- Resolve any rebase or validation issues.

4. Delivery phase:
- Run `/git-open-pr` once checks are green and working tree is clean.

Constraints:
- Follow trunk and commit rules in `integrations/copilot/instructions/git-workflow.instructions.md`.
- Keep commits atomic and Conventional Commit compliant.
- Prefer many small coherent commits over one large commit.
