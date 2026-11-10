---
status: proposed
date: 2026-11-10
tags: [layout, handbook, visibility, projects]
---

# How a handbook is laid out

## Context

A company keeps several kinds of writing that look alike and behave
differently: how work is done, what the company is and knows, what was
decided, the work in progress, the style of what goes out. Put on one level,
as areas of the company each holding tasks, documents and decisions side by
side, they mix things that change at different speeds and are read by
different people. Some writing must not reach everyone, and files a git host
serves can only be shared repository by repository.

## Decision

A handbook holds everything about how a company works and what it is, except
the work in progress. Its folders follow the nature of the content, not the
areas of the company.

**Four questions decide where an entry goes**, by how it changes:

| Question | What it is | When it changes | Folder |
|---|---|---|---|
| How is it done? | The method: roles, processes with their steps, rules, tools, skills, agents, meetings | Rewritten when the way of working changes | `operations/` |
| What is the company, what does it know? | Mission, strategy, offer, market, competitors | Rewritten when reality changes | `knowledge/` |
| What was decided, where does it come from? | Decisions and sources | New entries are added; old ones are not rewritten | `decisions/`, `sources/` |
| What are we doing now? | Tasks | Every day, then closed | Outside the handbook: the tracker |

The style of what goes out (look, voice, channels) is method applied to
communication, and lives in `brand/`, with its tokens in DTCG as the original.
Terms the company has approved live in `glossary/`.

**Projects** document a piece of work with a start and an end, in
`projects/<name>/`: why it exists, its owner and status, its decisions, what
it produced (`deliverables/`) and, while it runs, its working drafts
(`work/`). It links its tasks in the tracker and its code in its own
repository, and holds neither. A project carries out an initiative of
`knowledge/`; when it ends its record stays, and what it found that lasts
moves to `knowledge/`.

**Intermediate artifacts** have one of four fates:

- material received (transcripts, documents, exports) is a source, kept
  unchanged in `sources/`;
- a draft lives in its project's `work/` and, when the project ends, becomes a
  deliverable or an entry, or is deleted;
- a deliverable stays in its project's `deliverables/`, or in the company's
  drive with a link when it is a heavy or graphic file;
- a generated copy (pages, exports, CSS from tokens) is not kept: it is
  generated again from its original, or checked against it when committed.

An agent's working files stay out of the handbook.

**Visibility** is declared by each entry, as its status and owner are:
`visibility: public | internal | restricted`, with a default per type in the
schema. A rule in `operations/` says which roles see restricted entries. An
entry may link entries less visible than itself: a public package cites the
internal decision and the source it comes from. A copy for a wider audience
keeps the text of such a link and drops the link. What must not happen is
restricted content inside a more visible entry: an entry that mixes both, such
as a supplier with its public name and its private terms, is split in two.
The handbook declares who sees what; the system that serves the files
enforces it. With a git host, that means one repository per level, the wider
ones generated from the entries they may show.

## Consequences

An entry's folder answers one question, so a person or an agent knows where
to look and where to write. A change of the way of working, a change of the
facts and a new decision leave different traces. Moving from a git host to a
system that enforces permissions per entry changes who enforces visibility,
not the handbook.

## Discarded directions

- **Folders by company area, each holding every kind of entry.** Tasks,
  decisions and knowledge of one area end up side by side; a reader looking
  for how something is done finds work in progress, and the speed of the
  fastest content sets the noise for all.
- **Tasks in the handbook.** They change daily and close; a tracker is made
  for them, and the handbook links them from projects.
- **An open-questions register.** A question is either work (a task) or a gap
  an entry states where it occurs; a register of its own duplicates both.
- **Encrypting restricted files in the repository.** File names stay visible,
  diffs and agents read noise, and revoking a person means encrypting again
  while the old history stays readable with the old key.
- **Refusing links to less visible entries.** On a real handbook most public
  entries cite internal sources and decisions as their provenance; refusing
  the link hides where a fact comes from without protecting anything, since
  the risk is restricted content, not a reference.
