---
status: accepted
date: 2026-10-21
tags: [check, schema]
---

# A check driven by the schema

## Context

A playbook rots in predictable ways: links to entries that do not exist, to
entries that were superseded, entries in force that rest on drafts, rules
cited in the text and never linked. These are structural and can be found
without reading the meaning of the text. Companies differ in their entry
types, fields and statuses.

## Decision

- **`schema.yaml` describes the structure**: entry types, folders, prefixes
  where a playbook keeps codes,
  required fields, allowed values, status categories and link fields. The
  checker contains no folder, field or prefix of its own.
- **`playbook check` verifies links**: every link leads to an entry that
  exists (A), leads to something not retired, and from an entry in force not
  to a provisional one (B), and the text mentions only declared links (C);
  plus the format those need.
- **Pending entries.** During a migration, `pending` in the schema names a
  file of names (or codes) and statuses still kept elsewhere: links to them are warnings,
  and their statuses count.
- **Meaning is out of scope.** Contradictions, duplicates and ignored
  exceptions are found by review, by people and by agents with a dedicated
  skill.

## Consequences

Adding an entry type or a link changes the schema, not the code. The check is
deterministic and cheap enough to run before every commit.
