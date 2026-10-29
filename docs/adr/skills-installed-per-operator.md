---
status: accepted
date: 2026-10-22
tags: [skills, install, agents]
---

# Skills installed per operator

## Context

The shared skills are used in every project an operator works on: a client
repository, a document, the playbook itself. They are tools, not content of
the playbook. Some projects need a skill off, or on, for that project only.

## Decision

- **Each operator installs the shared skills once, at user level, in each
  agent**: `claude plugin install playbook --marketplace LunetteOrg/playbook-framework`
  in Claude Code, `npx skills add LunetteOrg/playbook-framework -g -a <agent>` in the
  others (`~/.agents/skills`, read by OpenCode and Codex).
- **A playbook does not carry the shared skills** nor the agent settings that
  install them.
- **A project turns a user-level skill on or off in the agent's own project
  configuration**: `permission.skill` in OpenCode's `opencode.json`,
  `enabledPlugins` in Claude Code's `.claude/settings.json`,
  `[[skills.config]]` in Codex's `config.toml`.

## Consequences

One install serves every project, and an update reaches all of them at once.
Per-project activation is written in each agent's format until
`playbook install` (#5) generates it from the operator's profile (#4).
Codex documents `[[skills.config]]` in the user configuration; whether a
project's `.codex/config.toml` accepts it is to be verified.

## Discarded directions

- **Skills installed in each project.** They would be copied into every
  repository, drift between copies, and mix tools with the playbook's content.
