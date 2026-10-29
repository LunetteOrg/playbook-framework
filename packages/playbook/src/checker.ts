// Structural check of a playbook, driven by its schema.yaml.
//
// Every link between entries lives in the header. The check verifies that:
//   A. every link leads to an entry that exists (in the repository, or in the
//      schema's list of pending entries, kept elsewhere for now);
//   B. every link leads to something still valid: no entry links to a retired
//      one, and a valid entry does not link to a provisional one;
//   C. the text mentions only entries that the header declares as links;
// plus the minimum those three need: well-formed headers, allowed values, file
// names that match codes, unique identifiers.
//
// An entry is identified by its code when its type has a prefix, otherwise by
// its file name. Links are names, codes or Obsidian wikilinks ([[name]],
// [[name|text]], [[name#heading]]). A code inherited from a previous system
// lives in the entry's `aliases`: a link through it resolves, with a warning.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'

export type Result = { errors: string[]; warnings: string[] }

type Category = 'valid' | 'provisional' | 'retired'

type KindSchema = {
  folder: string
  prefix?: string
  file?: string
  name?: string
  required?: string[]
  fields?: Record<string, string[]>
  status: { field: string; values: Record<string, Category> }
  links?: Record<string, string>
}

type Kind = KindSchema & { type: string }

type Schema = { kinds: Kind[]; pending?: string }

type Entry = {
  kind: Kind
  id: string
  path: string
  header: Record<string, unknown>
  body: string
}

type Target = { id: string; kind: Kind; status: string; inRepository: boolean }

type Index = { targets: Map<string, Target>; aliases: Map<string, string> }

export function check(root: string): Result {
  const errors: string[] = []
  const warnings = new Set<string>()

  const schema = readSchema(root)
  if (schema.kinds.length === 0) {
    return { errors: ['schema.yaml: missing, or it describes no entry type'], warnings: [] }
  }

  const entries = schema.kinds.flatMap((kind) => readEntries(root, kind, errors))
  const index = indexTargets(root, schema, entries, errors)
  const { targets, aliases } = index
  const codePattern = codeRegex(schema.kinds, [...aliases.keys()])
  checkAttachments(root, schema, targets, errors)
  checkConfig(root, codePattern, index, errors)

  for (const e of entries) {
    const source = category(e.kind, statusOf(e))
    const declared = new Set<string>()

    for (const [field, targetKindName] of Object.entries(e.kind.links ?? {})) {
      const targetKind = schema.kinds.find((k) => k.type === targetKindName)
      for (const value of list(get(e.header, field)).map(linkName)) {
        const id = aliases.get(value) ?? value
        declared.add(id)
        const target = targets.get(id)
        if (!target) {
          errors.push(`${e.path}: "${field}" links ${value}, which does not exist`)
          continue
        }
        if (id !== value)
          warnings.add(`${e.path}: "${field}" links ${value}, an alias of ${id}: link [[${id}]]`)
        if (target.kind !== targetKind) {
          errors.push(
            `${e.path}: "${field}" links ${value}, which is a ${target.kind.type}, not a ${targetKindName}`,
          )
          continue
        }
        if (!target.inRepository) warnings.add(`${value} is linked but still pending`)
        if (source === 'retired') continue
        const targetCategory = category(target.kind, target.status)
        if (targetCategory === 'retired') {
          errors.push(`${e.path}: "${field}" links ${value}, whose status is "${target.status}"`)
        } else if (source === 'valid' && targetCategory === 'provisional') {
          errors.push(
            `${e.path}: status is "${statusOf(e)}" but "${field}" links ${value}, whose status is "${target.status}"`,
          )
        }
      }
    }

    const linkFields = new Set(Object.keys(e.kind.links ?? {}))
    const text = [e.body, ...descriptiveValues(e.header, linkFields)].join('\n')
    const mentions = new Set(text.match(codePattern) ?? [])
    for (const name of wikilinks(text)) {
      if (targets.has(name) || aliases.has(name)) mentions.add(name)
      else errors.push(`${e.path}: mentions [[${name}]] in the text, which does not exist`)
    }
    for (const mention of mentions) {
      const id = aliases.get(mention) ?? mention
      if (id !== e.id && !declared.has(id)) {
        errors.push(`${e.path}: mentions ${mention} in the text but not among the header links`)
      }
    }
  }

  return { errors: [...new Set(errors)].sort(), warnings: [...warnings].sort() }
}

function readSchema(root: string): Schema {
  const file = join(root, 'schema.yaml')
  if (!existsSync(file)) return { kinds: [] }
  const schema = parseYaml(readFileSync(file, 'utf8')) as {
    types?: Record<string, KindSchema>
    pending?: string
  } | null
  const kinds = Object.entries(schema?.types ?? {}).map(([type, kind]) => ({ type, ...kind }))
  return { kinds, pending: schema?.pending }
}

function readEntries(root: string, kind: Kind, errors: string[]): Entry[] {
  const folder = join(root, kind.folder)
  if (!existsSync(folder)) return []
  const entries: Entry[] = []

  const files = kind.file
    ? readdirSync(folder, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({ path: `${kind.folder}/${d.name}/${kind.file}`, name: d.name }))
    : readdirSync(folder)
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .map((f) => ({ path: `${kind.folder}/${f}`, name: f }))

  for (const { path, name } of files.sort((a, b) => a.path.localeCompare(b.path))) {
    if (!existsSync(join(root, path))) {
      errors.push(`${path}: missing`)
      continue
    }
    const parsed = parse(root, path, errors)
    if (!parsed) continue
    const id = identify(kind, name, parsed.header, path, errors)
    checkRequired(kind, path, parsed.header, errors)
    checkStatus(kind, path, parsed.header, errors)
    checkFields(kind, path, parsed.header, errors)
    entries.push({ kind, id, path, ...parsed })
  }
  return entries
}

function identify(
  kind: Kind,
  name: string,
  header: Record<string, unknown>,
  path: string,
  errors: string[],
): string {
  if (kind.prefix) {
    const code = header.code === undefined ? '' : String(header.code)
    const match = new RegExp(`^${kind.prefix}-(\\d+)-[a-z0-9]+(?:-[a-z0-9]+)*\\.md$`).exec(name)
    if (!match) {
      errors.push(
        `${path}: the file name must be ${kind.prefix}-<n>-<topic>.md, with a lowercase, hyphenated topic`,
      )
    } else if (code && code !== `${kind.prefix}-${match[1]}`) {
      errors.push(`${path}: code ${code} does not match the file name`)
    }
    return code || name
  }
  const id = kind.file ? name : name.replace(/\.md$/, '')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    errors.push(`${path}: the name must be lowercase and hyphenated`)
  }
  if (kind.name) {
    const declared = get(header, kind.name)
    if (declared !== undefined && declared !== id) {
      errors.push(`${path}: "${kind.name}" is "${declared}", it must be "${id}"`)
    }
  }
  return id
}

function indexTargets(root: string, schema: Schema, entries: Entry[], errors: string[]): Index {
  const targets = new Map<string, Target>()
  const aliases = new Map<string, string>()
  const paths = new Map<string, string[]>()

  for (const e of entries) {
    paths.set(e.id, [...(paths.get(e.id) ?? []), e.path])
    targets.set(e.id, { id: e.id, kind: e.kind, status: statusOf(e), inRepository: true })
    for (const alias of list(e.header.aliases)) {
      paths.set(alias, [...(paths.get(alias) ?? []), e.path])
      aliases.set(alias, e.id)
    }
  }
  for (const [id, files] of paths) {
    if (files.length > 1) errors.push(`${id} appears in more than one file: ${files.sort().join(', ')}`)
  }

  // Entries kept elsewhere for now, typically during a migration: code or
  // name, status, and the type when it is not given by a prefix, one per line,
  // tab-separated.
  if (schema.pending) {
    const file = join(root, schema.pending)
    if (existsSync(file)) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim() || line.startsWith('#')) continue
        const [id, status, type] = line.split('\t').map((s) => s.trim())
        const kind = type
          ? schema.kinds.find((k) => k.type === type)
          : schema.kinds.find((k) => k.prefix && id.startsWith(`${k.prefix}-`) && /-\d+$/.test(id))
        if (kind && !targets.has(id)) targets.set(id, { id, kind, status, inRepository: false })
      }
    } else {
      errors.push(`${schema.pending}: listed as "pending" in schema.yaml but missing`)
    }
  }
  return { targets, aliases }
}

// Files an entry needs (a script, a model, a template) live in a folder named
// after its code or name, next to it: procedures/PROCEDURE-3/,
// procedures/onboarding/. They are not entries.
function checkAttachments(root: string, schema: Schema, targets: Map<string, Target>, errors: string[]) {
  for (const kind of schema.kinds) {
    const folder = join(root, kind.folder)
    if (kind.file || !existsSync(folder)) continue
    for (const d of readdirSync(folder, { withFileTypes: true })) {
      if (d.isDirectory() && !targets.get(d.name)?.inRepository) {
        errors.push(`${kind.folder}/${d.name}/: attachments of ${d.name}, which does not exist`)
      }
    }
  }
}

// The configuration the skills read may name entries (the rules a skill
// applies), by code or wikilink: they must exist.
function checkConfig(root: string, codePattern: RegExp, { targets, aliases }: Index, errors: string[]) {
  const file = '.playbook/config.yaml'
  if (!existsSync(join(root, file))) return
  const text = readFileSync(join(root, file), 'utf8')
  for (const code of new Set(text.match(codePattern) ?? [])) {
    if (!targets.has(code) && !aliases.has(code))
      errors.push(`${file}: mentions ${code}, which does not exist`)
  }
  for (const name of wikilinks(text)) {
    if (!targets.has(name) && !aliases.has(name))
      errors.push(`${file}: mentions [[${name}]], which does not exist`)
  }
}

function parse(root: string, path: string, errors: string[]) {
  const text = readFileSync(join(root, path), 'utf8')
  const parts = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text)
  if (!parts) {
    errors.push(`${path}: missing YAML header`)
    return undefined
  }
  let header: unknown
  try {
    header = parseYaml(parts[1])
  } catch (e) {
    errors.push(`${path}: invalid YAML header (${(e as Error).message.split('\n')[0]})`)
    return undefined
  }
  if (typeof header !== 'object' || header === null) {
    errors.push(`${path}: missing YAML header`)
    return undefined
  }
  return { header: header as Record<string, unknown>, body: parts[2] }
}

function checkRequired(kind: Kind, path: string, header: Record<string, unknown>, errors: string[]) {
  const fields = [
    ...(kind.prefix ? ['code'] : []),
    ...(kind.name ? [kind.name] : []),
    kind.status.field,
    ...(kind.required ?? []),
  ]
  for (const field of fields) {
    const value = get(header, field)
    if (value === undefined || value === null) errors.push(`${path}: missing field "${field}"`)
  }
}

function checkStatus(kind: Kind, path: string, header: Record<string, unknown>, errors: string[]) {
  const value = get(header, kind.status.field)
  if (value !== undefined && value !== null && !(String(value) in kind.status.values)) {
    const allowed = Object.keys(kind.status.values).join(', ')
    errors.push(`${path}: "${kind.status.field}" is "${value}"; allowed: ${allowed}`)
  }
}

function checkFields(kind: Kind, path: string, header: Record<string, unknown>, errors: string[]) {
  for (const [field, allowed] of Object.entries(kind.fields ?? {})) {
    const value = get(header, field)
    if (value !== undefined && value !== null && !allowed.includes(String(value))) {
      errors.push(`${path}: "${field}" is "${value}"; allowed: ${allowed.join(', ')}`)
    }
  }
}

function statusOf(e: Entry): string {
  const value = get(e.header, e.kind.status.field)
  return value === undefined || value === null ? '' : String(value)
}

function category(kind: Kind, status: string): Category | undefined {
  return kind.status.values[status]
}

// Header values that are not links, flattened to text, so that codes mentioned
// there are checked like codes mentioned in the body.
function descriptiveValues(header: Record<string, unknown>, linkFields: Set<string>, prefix = ''): string[] {
  const values: string[] = []
  for (const [key, value] of Object.entries(header)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (linkFields.has(path) || path === 'code' || path === 'aliases') continue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      values.push(...descriptiveValues(value as Record<string, unknown>, linkFields, path))
    } else if (value !== undefined && value !== null) {
      values.push(Array.isArray(value) ? value.join(', ') : String(value))
    }
  }
  return values
}

// Codes of the types with a prefix, and the aliases entries declare.
function codeRegex(kinds: Kind[], aliases: string[]): RegExp {
  const prefixes = kinds.flatMap((k) => (k.prefix ? [`${k.prefix}-\\d+`] : []))
  const escaped = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const words = [...prefixes, ...escaped].sort((a, b) => b.length - a.length)
  return words.length === 0 ? /(?!)/g : new RegExp(`\\b(?:${words.join('|')})\\b`, 'g')
}

// The entries a text links with wikilinks. Embeds (![[…]]), links to a heading
// of the same entry ([[#…]]) and links to files that are not Markdown are not
// entry links.
function wikilinks(text: string): Set<string> {
  const names = new Set<string>()
  for (const [, embed, target] of text.matchAll(/(!?)\[\[([^\]]*)\]\]/g)) {
    if (embed) continue
    const name = linkName(target)
    if (name && !/\.[a-z0-9]+$/i.test(name)) names.add(name)
  }
  return names
}

// A link written as a name, a code or a wikilink, reduced to the name:
// [[rules/customer-data#Storage|the rule]] is customer-data.
function linkName(link: string): string {
  const inner = link
    .replace(/^\[\[|\]\]$/g, '')
    .split('|')[0]
    .split('#')[0]
    .trim()
  return inner.replace(/\.md$/, '').split('/').pop() ?? ''
}

function get(header: Record<string, unknown>, path: string): unknown {
  let value: unknown = header
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

// A list of links. An unquoted wikilink in a YAML list, rules: [[name]], is read
// as a nested list.
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.flat(Number.POSITIVE_INFINITY).map(String)
  if (typeof value === 'string')
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  return []
}
