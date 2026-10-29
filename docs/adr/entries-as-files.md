---
status: accepted
date: 2026-10-29
tags: [format, entries, statuses]
---

# Entries as files

## Context

A company's way of working (rules, processes, procedures, the tools it uses,
the skills its agents run) is often kept in a database product. The content
then works only inside that product, cannot be versioned with the code, and
is read by agents through a connector at best.

## Decision

- **One Markdown file per entry, with a YAML header.** One folder per entry
  type. Agents and editors read the files directly; the repository is the
  only source.
- **Named by file.** An entry's name is its file name, lowercase and
  hyphenated: `rules/customer-data.md` is `customer-data`. Names are unique
  across the playbook, so a link needs no folder, as in an Obsidian vault.
  Skills are named by folder, in the Agent Skills format. A code inherited
  from a previous system stays in the entry's `aliases` while people and
  documents still cite it.
- **Codes for a schema that keeps them.** A type with a `prefix` in the schema
  is named by `code: <PREFIX>-<n>` and lives in
  `<folder>/<PREFIX>-<n>-<topic>.md`, for playbooks that have not moved to
  names.
- **Statuses in three categories.** Each type names its own status values and
  maps each to `valid` (it applies), `provisional` (in preparation) or
  `retired` (it no longer applies). The checker reasons on categories only.
- **English structure, company language content.** Field names, enumerated
  values and folders are in English; titles and text are in the company's
  language.

## Consequences

A playbook opens as an Obsidian vault with working links, backlinks and graph;
renaming an entry there updates the links to it.

The content moves with a `git clone`, any tool can read it, and changes go
through the same review as code. A company that wants a database view builds
it from the files, never the other way round.

## Discarded directions

- **Numbered codes as the identifier.** A code says nothing of what an entry
  is, needs a lookup to be read, and ties links to a numbering. Names say what
  the entry is; old codes survive as aliases.
