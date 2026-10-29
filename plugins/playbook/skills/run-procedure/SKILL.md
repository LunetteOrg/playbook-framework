---
name: run-procedure
description: "Carries out a procedure of the company playbook, step by step, with the rules, tools and attachments it links. Use when asked to do a task the playbook describes (by its name, an old code, its title or what it achieves), or when a piece of work matches a procedure's trigger."
metadata:
  status: in-force
---

# Run a procedure

The company's method lives in its playbook, as procedures that link the rules
they follow and the tools they use. This skill carries one out. It contains no
method of its own: what to do, in which order and under which rules is in the
procedure, read every time.

The playbook is the repository you are working in when it has a
`schema.yaml`; otherwise the folder the operator's instructions name;
otherwise the folder named by the `PLAYBOOK_DIR` environment variable. If none
exists, ask where the playbook is. `schema.yaml` says in which folder each type
of entry lives.

Find out who the operator is: their identity from the app or from their
instructions, then their record where `people` in `.playbook/config.yaml`
says. The record gives their roles and competences, described under `roles`
and `competences`. If you cannot reach it, ask the operator's role before the
first step whose owner matters.

## 1. Find the procedure

- Given a name, open the file with that name; given an old code, the entry
  that lists it in `aliases` (or, with prefixes in the schema, the file whose
  name starts with it).
- Given a task, look for the procedure whose title, purpose or trigger matches
  it. If more than one matches, or none does, say so and ask: never improvise
  a procedure the playbook does not have.

## 2. Check that it can be run

Read the header before the text.

- **Status.** A procedure in force is run as written. A draft or a trial is
  run only if the person asking says so, knowing it is not yet approved. A
  superseded procedure is not run: point to the one that replaces it.
- **Who carries it out.** Compare the operator's roles with the procedure's
  owner and with the role each step names. Do the steps that are the
  operator's; for a step that belongs to another role, prepare what that role
  needs, say who has to act, and stop there. If the header says a person
  carries it out, guide the operator through it instead of acting for them.
- **Data and risk.** If the header marks personal data or a high risk, apply
  the rules it links on data before touching anything.

## 3. Load what it links

- Every rule in `rules`: the rule is its title; read why and its exceptions.
- The rules whose `applies` is `everywhere`: they hold in any work.
- Every tool in `tools`: its card says how the company uses it. If you do not
  have access to a tool a step needs, stop at that step and say which one.
- Every skill in `skills`, and the procedures in `procedures` the text sends
  you to.
- The attachments in the folder named after the procedure, if there is
  one (a script, a model, a template), and the playbook's
  `.playbook/config.yaml`.

## 4. Carry it out

- Follow the steps in order. A step's result is the condition for the next.
- Before any step that leaves the company or cannot be undone (send, sign,
  publish, pay, delete, give access) show what you are about to do and wait
  for the person's confirmation, unless the procedure says the step needs
  none.
- An approval the procedure requires is asked of the role it names, never
  assumed.
- If the text and a rule disagree, or a step cannot be done as written, stop
  and say what conflicts: the rule holds over the procedure, and neither is
  changed while running it.

## 5. Report

Say what was done, with the outputs and where they are; what is left and who
has to do it; and any step done differently from the text, with the reason.
If the procedure needs changing, propose the change separately: the playbook is
never edited while a procedure is being run.
