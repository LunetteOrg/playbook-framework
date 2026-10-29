# Working on this playbook

This repository is a company playbook: its rules, processes, procedures, tools
and skills, as plain files any editor and any agent can read. The structure is
in [`schema.yaml`](schema.yaml); this file says how to change the content.

## What goes in

- Only the company's own method. No data about clients or people: no names,
  addresses, figures or examples taken from real work.
- Before adding an entry, look for one on the same subject and change that one.
- A rule is written once, where it belongs. Elsewhere it is linked, never
  copied.
- People are named by role (the owner, administration, operations), also in
  the `owner` field.

## Statuses

- A new entry starts as a draft.
- Only the person the company designates moves an entry to in force. An agent
  never sets that status: it proposes the change and leaves the decision.
- An entry that no longer holds is superseded, says which entry replaces it,
  and is not deleted.

## Names and files

- One folder per entry type, one file per entry. The file name is the entry's
  name: lowercase, hyphenated, unique across the playbook, and it does not
  change when the title does.
- A code inherited from a previous system stays in the entry's `aliases` while
  people and documents still cite it.
- Files an entry needs to be carried out (a script, a model, a template) live
  in a folder named after it, next to it: `procedures/send-an-invoice/`.

## Headers and links

- Every file starts with a YAML header. Field names and enumerated values
  follow `schema.yaml`.
- Links between entries live in the header, one field per link (`rules`,
  `procedures`, `tools`…), as wikilinks: `rules: ["[[customer-data]]"]`. Each relation is written on one side only: a
  process lists its procedures; a procedure does not repeat its process.
- The text links with wikilinks (`[[customer-data]]`), and only to entries
  declared in the header.
- No entry links to a retired entry; an entry in force does not link to a
  provisional one.

## Writing

- Describe what holds now, in the affirmative. Do not narrate how it came to
  be: readers were not in the conversation.
- Name a tool as today's choice ("transcribed with the company's tool, today
  …"), so the rule survives a change of tool.

## Before a commit

Run `pnpm playbook check`. Errors are fixed before the commit; warnings point
at pending entries or at entries waiting for approval.
