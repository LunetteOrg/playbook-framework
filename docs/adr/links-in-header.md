---
status: accepted
date: 2026-10-29
tags: [links, header, agents]
---

# Links in the header

## Context

An agent that runs a procedure needs to know which rules apply and which tools
and skills it uses, before reading the text. A program that builds a bundle
for a role, or finds what a change affects, needs the same links as data.
Links written twice (in the text and in a list, or on both sides of a
relation) drift apart.

## Decision

- **Links live in the header**, one field per link (`rules`, `procedures`,
  `tools`, `skills`…), as lists of wikilinks (`"[[customer-data]]"`), names
  or, where the schema keeps them, codes.
- **Each relation is written on one side.** A process lists its procedures, in
  order; a procedure does not repeat the process that contains it. The other
  side is derived when needed.
- **The text mentions only declared links.** A wikilink, an alias or a code
  in the body, or in a descriptive header field, must also be in a link
  field. The text links with wikilinks so that an editor such as Obsidian
  follows them. The text stays
  readable, and the header stays complete.
- **A rule's links are the references in its text**, not where it applies.
  Where a rule applies is its `applies` field: `everywhere`, or `where-cited`
  by the processes and procedures that list it.

## Consequences

An agent reads a header and knows which files to load. The checker verifies
links as data, without interpreting prose.
