---
mode: agent
description: "Invoke the Debt Curator agent to scan, triage, report, and normalize TODO/FIXME/HACK/NOTE/OPTIMIZE/BUG/XXX reminders"
---

Activate the Debt Curator agent: [debt-curator.agent.md](../agents/debt-curator.agent.md).

Scope: the entire workspace unless a path or package name is provided as an argument.

Default output: summary → hotspots → stale list (threshold: 180 days).
- For each reminder entry include: `severity`, `tag`, `file:line`, `age_days`, `author`, `ticket`, `message`.

If the user asks only for one view (summary, hotspots, or stale), return only that view.