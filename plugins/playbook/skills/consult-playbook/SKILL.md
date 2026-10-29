---
name: consult-playbook
description: "Finds and explains what the company playbook says: how a task is done, which rules apply, who does what, which tool is used. Use for any question about the company's way of working, before answering from general knowledge."
metadata:
  status: in-force
---

# Consult the playbook

The playbook is the company's method: rules, processes, procedures and tool
cards, one entry per file. This skill finds what it says and answers from it.
It contains no method of its own.

## Where the playbook is

The repository you are working in when it has a `schema.yaml`; otherwise the
folder the operator's instructions name; otherwise the folder named by the
`PLAYBOOK_DIR` environment variable;
otherwise a tool that gives access to it, such as the company's document
server. If none is available, say so and ask: never answer the company's way
of working from general knowledge.

The operator's roles and competences are in their record, where `people` in
`.playbook/config.yaml` says; their identity comes from the app or from their
instructions.

## 1. Learn its structure

Read `schema.yaml` first. It says which types of entry exist, in which folder
each lives, which header fields
are required, which status values mean valid, provisional or retired, and
which header fields are links to other entries.

`.playbook/config.yaml` holds values particular to the company (brands, the
settings of the shared skills). Folders the schema does not list are not
method: do not use them as a source.

## 2. Find the entries

- **By name**: the name gives the file. `[[customer-data]]` is
  `customer-data.md` in one of the schema's folders. An old code (`X-4`) is
  found in the `aliases` of an entry's header; in a playbook whose schema
  still has prefixes, it is the file whose name starts with `X-4-`.
- **By subject**: the title of an entry is the first heading of its text
  (`# …`), not a header field, and states its content in one line (for a
  rule, the rule itself). Search titles first, then the text.
- **By field**: areas, owners and other attributes are header fields; filter
  on them.

Files in a folder named after an entry are its attachments (models,
schemas, scripts), not entries.

## 3. Follow the links

Links between entries live in the header, one field per link, and the text
links (with wikilinks) only to entries the header declares. Each relation is written on one side
only: a process lists its procedures, and a procedure does not repeat its
process. To find what links to an entry, search its name in the link fields of
the other entries.

To answer a question about a procedure, read it together with the rules,
tools and procedures it links. To answer a question about a process, read its
procedures in the order it lists them.

## 4. Tell what holds

- Only a valid entry applies. A provisional one (a draft, a trial) is a
  proposal: say so when you cite it. A retired one no longer applies: point to
  the entry that replaces it, if its header names one.
- A rule applies everywhere or only where an entry cites it, as its header
  says. Rules that apply everywhere hold in any answer about the work.
- If two entries disagree, report the disagreement with both names instead of
  choosing one.

## 5. Answer

- **A question about a specific client, person or case.** The playbook holds
  no data about them, by design: it says where such data lives (the tool
  cards and the rules on records and folders) and who may reach it. If you
  have access to those systems, read there what the question needs, only that,
  following the playbook's rules on access and on data; if the question is a
  task the playbook describes, use `run-procedure`. If you have no access, say
  where to look.
- **A vague question.** If a word can mean several things and the answers
  differ, answer each reading briefly and ask which one was meant.
- Answer for the operator: what their roles do and decide, in the form their
  competences need. When the answer differs by role and the role is unknown,
  ask it.
- Answer with what the playbook says and cite the names of the entries you
  used, so the reader can open them. Summarise; do not copy whole entries.
- Say plainly when the playbook does not cover the question, and what is
  closest. Do not fill the gap with general practice presented as the
  company's.
- To carry out a procedure, use the `run-procedure` skill. To propose a change
  to the playbook, say what and where; the playbook is not edited while
  answering.
- If you find an entry that breaks the playbook's own rules (data about real
  clients or people, a contradiction, a link to a retired entry), report it at
  the end of the answer with its name, as a defect to fix.
