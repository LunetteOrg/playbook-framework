# Working on the Lunette playbook framework

This repository is the framework, not a company playbook. It holds the
`playbook` command, the template every company playbook starts from, and the
skills they share. The layout is in the [README](README.md); decisions are in
[`docs/adr/`](docs/adr/README.md).

- **Two levels, never confused.** The framework decides how a playbook is
  structured and checked. A company's rules, processes and procedures live in
  that company's repository, never here.
- **Nothing company-specific enters this repository.** No company names, codes,
  rules, people or clients, not even as examples: examples are invented and
  neutral. A pre-commit hook blocks the terms listed in each contributor's
  personal file (`scripts/check-forbidden-terms.sh`).
- **A shared skill is never edited to fit a company.** What is particular to a
  company is a value in its `.playbook/config.yaml`, which the skill reads.
- **The checker follows the schema.** A rule that depends on a folder, a field
  or a prefix belongs in `schema.yaml`, not in the code.
- **English** for code, documentation, skills and messages.
- **Tests first** for a change to the checker or the scaffolder: `pnpm test`.
