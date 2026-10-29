import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, test } from 'node:test'
import { check } from '../src/checker.ts'

// A small schema of its own: the checker must work with any structure a schema
// describes, so the tests do not rely on the template's.
const SCHEMA = `
types:
  rule:
    folder: rules
    prefix: RULE
    required: [area]
    status:
      field: status
      values: { in-force: valid, draft: provisional, superseded: retired }
    links:
      rules: rule
      tools: tool
  process:
    folder: processes
    prefix: PROCESS
    status:
      field: status
      values: { in-force: valid, draft: provisional, superseded: retired }
    links:
      procedures: procedure
      rules: rule
  procedure:
    folder: procedures
    prefix: PROCEDURE
    status:
      field: status
      values: { in-force: valid, draft: provisional, superseded: retired }
    links:
      rules: rule
      tools: tool
  tool:
    folder: tools
    required: [name]
    status:
      field: status
      values: { active: valid, trial: provisional, dismissed: retired }
    links:
      rules: rule
  skill:
    folder: skills
    file: SKILL.md
    name: name
    required: [description]
    status:
      field: metadata.status
      values: { in-force: valid, superseded: retired }
    links:
      metadata.rules: rule
`

const roots: string[] = []

function playbook(files: Record<string, string>, schema = SCHEMA): string {
  const root = mkdtempSync(join(tmpdir(), 'playbook-'))
  roots.push(root)
  for (const [path, text] of Object.entries({ 'schema.yaml': schema, ...files })) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text)
  }
  return root
}

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true })
})

function entry(header: Record<string, string>, body = 'Text.'): string {
  const lines = Object.entries(header).map(([k, v]) => `${k}: ${v}`)
  return `---\n${lines.join('\n')}\n---\n\n# Title\n\n${body}\n`
}

const rule = (code: string, status = 'in-force', extra: Record<string, string> = {}, body = 'Text.') =>
  entry({ code, status, area: 'operations', ...extra }, body)

const procedure = (code: string, status = 'in-force', extra: Record<string, string> = {}, body = 'Text.') =>
  entry({ code, status, ...extra }, body)

const tool = (name: string, status = 'active') => entry({ name, status })

describe('a consistent playbook', () => {
  test('reports nothing', () => {
    const r = playbook({
      'rules/RULE-1-one.md': rule('RULE-1'),
      'procedures/PROCEDURE-1-do.md': procedure(
        'PROCEDURE-1',
        'in-force',
        { rules: '[RULE-1]', tools: '[wiki]' },
        'See RULE-1.',
      ),
      'processes/PROCESS-1-one.md': procedure(
        'PROCESS-1',
        'draft',
        { procedures: '[PROCEDURE-1]' },
        'Run PROCEDURE-1.',
      ),
      'tools/wiki.md': tool('Wiki'),
    })
    assert.deepEqual(check(r), { errors: [], warnings: [] })
  })

  test('ignores README files in entry folders', () => {
    const r = playbook({ 'rules/README.md': '# Rules\n' })
    assert.deepEqual(check(r).errors, [])
  })

  test('files in a folder named after an entry are its attachments, not entries', () => {
    const r = playbook({
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force'),
      'procedures/PROCEDURE-1/generate.py': 'print(1)\n',
      'procedures/PROCEDURE-1/model.md': '# Model\n',
    })
    assert.deepEqual(check(r).errors, [])
  })

  test('attachments of a missing entry are an error', () => {
    const r = playbook({ 'procedures/PROCEDURE-2/model.md': '# Model\n' })
    assert.deepEqual(check(r).errors, [
      'procedures/PROCEDURE-2/: attachments of PROCEDURE-2, which does not exist',
    ])
  })
})

describe('A: every link leads somewhere', () => {
  test('a link to a missing entry is an error', () => {
    const r = playbook({
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', { rules: '[RULE-9]' }),
    })
    assert.ok(
      check(r).errors.includes('procedures/PROCEDURE-1-do.md: "rules" links RULE-9, which does not exist'),
    )
  })

  test('a link to a pending entry is a warning', () => {
    const r = playbook(
      {
        'pending.tsv': '# comment\nRULE-9\tin-force\n',
        'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', { rules: '[RULE-9]' }),
      },
      `pending: pending.tsv\n${SCHEMA}`,
    )
    assert.deepEqual(check(r), { errors: [], warnings: ['RULE-9 is linked but still pending'] })
  })

  test('a pending list named in the schema must exist', () => {
    const r = playbook({}, `pending: pending.tsv\n${SCHEMA}`)
    assert.ok(check(r).errors.includes('pending.tsv: listed as "pending" in schema.yaml but missing'))
  })

  test('a link of the wrong type is an error', () => {
    const r = playbook({
      'procedures/PROCEDURE-2-other.md': procedure('PROCEDURE-2'),
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', { rules: '[PROCEDURE-2]' }),
    })
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: "rules" links PROCEDURE-2, which is a procedure, not a rule',
      ),
    )
  })

  test('a link to a missing tool is an error', () => {
    const r = playbook({ 'rules/RULE-1-one.md': rule('RULE-1', 'in-force', { tools: '[mailer]' }) })
    assert.ok(check(r).errors.includes('rules/RULE-1-one.md: "tools" links mailer, which does not exist'))
  })

  test('a link inside a nested field is checked', () => {
    const r = playbook({
      'skills/do-things/SKILL.md': entry({
        name: 'do-things',
        description: 'Does things.',
        metadata: '\n  status: in-force\n  rules: "RULE-5"',
      }),
    })
    assert.ok(
      check(r).errors.includes(
        'skills/do-things/SKILL.md: "metadata.rules" links RULE-5, which does not exist',
      ),
    )
  })
  test('a code in the configuration must exist', () => {
    const r = playbook({
      'rules/RULE-1-r.md': rule('RULE-1', 'in-force'),
      '.playbook/config.yaml': 'skills:\n  apply-design-system:\n    rules: [RULE-1, RULE-7]\n',
    })
    assert.deepEqual(check(r).errors, ['.playbook/config.yaml: mentions RULE-7, which does not exist'])
  })
})

describe('B: every link leads to something still valid', () => {
  test('a link to a retired entry is an error', () => {
    const r = playbook({
      'rules/RULE-8-old.md': rule('RULE-8', 'superseded'),
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', { rules: '[RULE-8]' }),
    })
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: "rules" links RULE-8, whose status is "superseded"',
      ),
    )
  })

  test('a pending entry with a retired status counts as retired', () => {
    const r = playbook(
      {
        'pending.tsv': 'RULE-8\tsuperseded\n',
        'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'draft', { rules: '[RULE-8]' }),
      },
      `pending: pending.tsv\n${SCHEMA}`,
    )
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: "rules" links RULE-8, whose status is "superseded"',
      ),
    )
  })

  test('a dismissed tool is retired', () => {
    const r = playbook({
      'tools/mailer.md': tool('Mailer', 'dismissed'),
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', { tools: '[mailer]' }),
    })
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: "tools" links mailer, whose status is "dismissed"',
      ),
    )
  })

  test('a valid entry cannot link to a provisional one', () => {
    const r = playbook({
      'rules/RULE-2-new.md': rule('RULE-2', 'draft'),
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', { rules: '[RULE-2]' }),
    })
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: status is "in-force" but "rules" links RULE-2, whose status is "draft"',
      ),
    )
  })

  test('a provisional entry can link to anything not retired', () => {
    const r = playbook({
      'rules/RULE-1-one.md': rule('RULE-1'),
      'rules/RULE-2-new.md': rule('RULE-2', 'draft'),
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'draft', { rules: '[RULE-1, RULE-2]' }),
    })
    assert.deepEqual(check(r).errors, [])
  })

  test('a retired entry is not checked for links', () => {
    const r = playbook({
      'rules/RULE-8-old.md': rule('RULE-8', 'superseded'),
      'rules/RULE-9-old.md': rule('RULE-9', 'superseded', { rules: '[RULE-8]' }),
    })
    assert.deepEqual(check(r).errors, [])
  })
})

describe('C: the text mentions only declared links', () => {
  test('a code in the body must be declared in the header', () => {
    const r = playbook({
      'rules/RULE-1-one.md': rule('RULE-1'),
      'rules/RULE-6-six.md': rule('RULE-6'),
      'procedures/PROCEDURE-1-do.md': procedure(
        'PROCEDURE-1',
        'in-force',
        { rules: '[RULE-1]' },
        'See RULE-1 and RULE-6.',
      ),
    })
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: mentions RULE-6 in the text but not among the header links',
      ),
    )
  })

  test('a code in a descriptive header field must be declared too', () => {
    const r = playbook({
      'rules/RULE-1-one.md': rule('RULE-1'),
      'procedures/PROCEDURE-1-do.md': procedure('PROCEDURE-1', 'in-force', {
        outcome: 'Done as RULE-1 says',
      }),
    })
    assert.ok(
      check(r).errors.includes(
        'procedures/PROCEDURE-1-do.md: mentions RULE-1 in the text but not among the header links',
      ),
    )
  })

  test('longer prefixes are matched before shorter ones', () => {
    const schema = `${SCHEMA}
  offer:
    folder: offers
    prefix: OFF
    status:
      field: status
      values: { active: valid }
  offering:
    folder: offerings
    prefix: OFFER
    status:
      field: status
      values: { active: valid }
`
    const r = playbook(
      {
        'offerings/OFFER-1-one.md': entry({ code: 'OFFER-1', status: 'active' }),
        'offers/OFF-1-one.md': entry({ code: 'OFF-1', status: 'active' }, 'Part of OFFER-1.'),
      },
      schema,
    )
    assert.ok(
      check(r).errors.includes(
        'offers/OFF-1-one.md: mentions OFFER-1 in the text but not among the header links',
      ),
    )
  })

  test('an entry may mention its own code', () => {
    const r = playbook({ 'rules/RULE-1-one.md': rule('RULE-1', 'in-force', {}, 'This is RULE-1.') })
    assert.deepEqual(check(r).errors, [])
  })
})

describe('entry format', () => {
  test('status must have an allowed value', () => {
    const r = playbook({ 'rules/RULE-1-one.md': rule('RULE-1', 'in force') })
    assert.ok(
      check(r).errors.includes(
        'rules/RULE-1-one.md: "status" is "in force"; allowed: in-force, draft, superseded',
      ),
    )
  })

  test('a field with listed values must use one of them', () => {
    const schema = SCHEMA.replace(
      '    required: [area]\n',
      '    required: [area]\n    fields:\n      area: [operations, sales]\n',
    )
    const r = playbook({ 'rules/RULE-1-one.md': rule('RULE-1', 'in-force', { area: 'kitchen' }) }, schema)
    assert.ok(
      check(r).errors.includes('rules/RULE-1-one.md: "area" is "kitchen"; allowed: operations, sales'),
    )
  })

  test('required fields must be present', () => {
    const r = playbook({ 'rules/RULE-1-one.md': entry({ code: 'RULE-1', status: 'draft' }) })
    assert.ok(check(r).errors.includes('rules/RULE-1-one.md: missing field "area"'))
  })

  test('the code must match the file name', () => {
    const r = playbook({ 'rules/RULE-1-one.md': rule('RULE-2') })
    assert.ok(check(r).errors.includes('rules/RULE-1-one.md: code RULE-2 does not match the file name'))
  })

  test('the file name is the code plus a lowercase hyphenated topic', () => {
    const r = playbook({ 'rules/RULE-1-Bad_Topic.md': rule('RULE-1') })
    assert.ok(
      check(r).errors.includes(
        'rules/RULE-1-Bad_Topic.md: the file name must be RULE-<n>-<topic>.md, with a lowercase, hyphenated topic',
      ),
    )
  })

  test('two files with the same code are an error', () => {
    const r = playbook({ 'rules/RULE-1-one.md': rule('RULE-1'), 'rules/RULE-1-two.md': rule('RULE-1') })
    assert.ok(
      check(r).errors.includes(
        'RULE-1 appears in more than one file: rules/RULE-1-one.md, rules/RULE-1-two.md',
      ),
    )
  })

  test('a file without a header is an error', () => {
    const r = playbook({ 'rules/RULE-1-one.md': '# Text\n' })
    assert.ok(check(r).errors.includes('rules/RULE-1-one.md: missing YAML header'))
  })

  test('a skill name must match its folder', () => {
    const r = playbook({ 'skills/do-things/SKILL.md': entry({ name: 'do-other', description: 'Does.' }) })
    assert.ok(
      check(r).errors.includes('skills/do-things/SKILL.md: "name" is "do-other", it must be "do-things"'),
    )
  })

  test('a missing schema is an error', () => {
    const r = playbook({}, '')
    assert.ok(check(r).errors.includes('schema.yaml: missing, or it describes no entry type'))
  })
})

describe('schema independence', () => {
  test('a type that exists only in the schema is checked like the others', () => {
    const schema = `${SCHEMA}
  offer:
    folder: offers
    prefix: OFFER
    status:
      field: status
      values: { active: valid, withdrawn: retired }
    links:
      processes: process
`
    const r = playbook(
      {
        'processes/PROCESS-1-one.md': procedure('PROCESS-1', 'superseded'),
        'offers/OFFER-1-website.md': entry({ code: 'OFFER-1', status: 'active', processes: '[PROCESS-1]' }),
      },
      schema,
    )
    assert.deepEqual(check(r).errors, [
      'offers/OFFER-1-website.md: "processes" links PROCESS-1, whose status is "superseded"',
    ])
  })
})

// Entries named by their file, linked with Obsidian's wikilinks: the schema
// has no prefixes, and an inherited code lives in `aliases`.
const NAMED = SCHEMA.replace(/\n {4}prefix: \w+/g, '')

const named = (status = 'in-force', extra: Record<string, string> = {}, body = 'Text.') =>
  entry({ status, area: 'operations', ...extra }, body)

describe('names and wikilinks', () => {
  test('entries named by file, linked with wikilinks in the header and the text', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named(),
        'procedures/onboarding.md': named(
          'in-force',
          { rules: '["[[customer-data]]"]', tools: '["[[wiki]]"]' },
          'Follow [[customer-data|the data rule]], section [[customer-data#Storage]].',
        ),
        'processes/sales.md': named('in-force', { procedures: '["[[onboarding]]"]' }),
        'tools/wiki.md': tool('Wiki'),
      },
      NAMED,
    )
    assert.deepEqual(check(r), { errors: [], warnings: [] })
  })

  test('an unquoted wikilink in a header list is read as a link', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named(),
        'procedures/onboarding.md': named('in-force', { rules: '[[customer-data]]' }),
      },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [])
  })

  test('a wikilink to a missing entry is an error', () => {
    const r = playbook(
      { 'procedures/onboarding.md': named('in-force', { rules: '["[[customer-data]]"]' }) },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [
      'procedures/onboarding.md: "rules" links customer-data, which does not exist',
    ])
  })

  test('a name is unique across folders', () => {
    const r = playbook({ 'rules/onboarding.md': named(), 'procedures/onboarding.md': named() }, NAMED)
    assert.ok(
      check(r).errors.includes(
        'onboarding appears in more than one file: procedures/onboarding.md, rules/onboarding.md',
      ),
    )
  })

  test('a wikilink in the text must be declared in the header', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named(),
        'procedures/onboarding.md': named('in-force', {}, 'Follow [[customer-data]].'),
      },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [
      'procedures/onboarding.md: mentions customer-data in the text but not among the header links',
    ])
  })

  test('a wikilink in the text to a missing entry is an error', () => {
    const r = playbook(
      { 'procedures/onboarding.md': named('in-force', {}, 'Follow [[customer-data]].') },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [
      'procedures/onboarding.md: mentions [[customer-data]] in the text, which does not exist',
    ])
  })

  test('embeds, links to a heading of the same entry and links to other files are not entry links', () => {
    const r = playbook(
      {
        'procedures/onboarding.md': named(
          'in-force',
          {},
          'See [[#Steps]], ![[diagram.png]] and [[onboarding/model.docx]].',
        ),
        'procedures/onboarding/model.docx': 'x',
      },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [])
  })

  test('an entry may link itself in its text', () => {
    const r = playbook(
      { 'rules/customer-data.md': named('in-force', {}, 'This is [[customer-data]].') },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [])
  })

  test('a link through an inherited code resolves, with a warning to use the name', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named('in-force', { aliases: '[RULE-12]' }),
        'procedures/onboarding.md': named('in-force', { rules: '[RULE-12]' }),
      },
      NAMED,
    )
    assert.deepEqual(check(r), {
      errors: [],
      warnings: [
        'procedures/onboarding.md: "rules" links RULE-12, an alias of customer-data: link [[customer-data]]',
      ],
    })
  })

  test('an alias mentioned in the text counts as a mention of its entry', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named('in-force', { aliases: '[RULE-12]' }),
        'rules/retention.md': named('in-force', { aliases: '[RULE-13]' }),
        'procedures/onboarding.md': named(
          'in-force',
          { rules: '["[[customer-data]]"]' },
          'As RULE-12 and RULE-13 say.',
        ),
      },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [
      'procedures/onboarding.md: mentions RULE-13 in the text but not among the header links',
    ])
  })

  test('an alias cannot repeat a name or another alias', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named('in-force', { aliases: '[RULE-12, retention]' }),
        'rules/retention.md': named(),
        'rules/old-data.md': named('superseded', { aliases: '[RULE-12]' }),
      },
      NAMED,
    )
    const { errors } = check(r)
    assert.ok(
      errors.includes('RULE-12 appears in more than one file: rules/customer-data.md, rules/old-data.md'),
    )
    assert.ok(
      errors.includes('retention appears in more than one file: rules/customer-data.md, rules/retention.md'),
    )
  })

  test('the attachments of a named entry live in a folder with its name', () => {
    const r = playbook(
      {
        'procedures/onboarding.md': named(),
        'procedures/onboarding/model.md': '# Model\n',
        'procedures/offboarding/model.md': '# Model\n',
      },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [
      'procedures/offboarding/: attachments of offboarding, which does not exist',
    ])
  })

  test('a pending entry is listed by name with its type', () => {
    const r = playbook(
      {
        'pending.tsv': 'customer-data\tin-force\trule\n',
        'procedures/onboarding.md': named('in-force', { rules: '["[[customer-data]]"]' }),
      },
      `pending: pending.tsv\n${NAMED}`,
    )
    assert.deepEqual(check(r), { errors: [], warnings: ['customer-data is linked but still pending'] })
  })

  test('a wikilink in the configuration must exist', () => {
    const r = playbook(
      {
        'rules/customer-data.md': named(),
        '.playbook/config.yaml':
          'skills:\n  apply-design-system:\n    rules: ["[[customer-data]]", "[[brand-voice]]"]\n',
      },
      NAMED,
    )
    assert.deepEqual(check(r).errors, [
      '.playbook/config.yaml: mentions [[brand-voice]], which does not exist',
    ])
  })
})
