# Lunette playbook framework

A framework for a company playbook that agents can use: rules, processes,
procedures, tools and skills as plain Markdown files with a YAML header, in a
repository the company owns. No database, no vendor: any editor and any agent
reads it, and it moves with a `git clone`.

```
packages/
  playbook/          @lntt/playbook: the `playbook` command
    src/checker.ts   structural check driven by the playbook's schema.yaml
  create-playbook/   @lntt/create-playbook: pnpm create @lntt/playbook <name>
    templates/default/   an empty company playbook
plugins/
  playbook/          skills shared by every playbook (apply-design-system, consult-playbook, run-procedure)
.claude-plugin/marketplace.json
docs/adr/            decisions about the framework
```

## Use

```sh
pnpm create @lntt/playbook acme-playbook
cd acme-playbook && pnpm install
pnpm playbook check
```

The shared skills install once per operator, in each agent, not in the playbook:

```sh
claude plugin install playbook --marketplace LunetteOrg/playbook-framework   # Claude Code
npx skills add LunetteOrg/playbook-framework -g -a <agent>                    # any other agent, e.g. -a opencode
```

They read the company's values from `.playbook/config.yaml` and are never
edited to fit a company.

Each operator says who they are and their preferences where each app keeps
them (a coding agent's user instructions, a chat app's personal preferences);
their roles and competences are a record the company keeps, which the
playbook's `people` points to.

How the framework is composed, where each kind of content lives and how it is
installed in each app: [docs/architecture.md](docs/architecture.md).

## What the check verifies

`playbook check` reads `schema.yaml` and verifies that every link between
entries leads to an entry that exists, that it leads to something still valid,
and that the text mentions only links declared in the header. It does not read
the meaning of the text: contradictions and duplicates are for review.

## Develop

```sh
pnpm install
pnpm test
pnpm lint
```

Node 24 runs the TypeScript sources directly.
