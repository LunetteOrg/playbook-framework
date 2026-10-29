import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import { check } from '@lntt/playbook'
import { create } from '../src/index.ts'

const roots: string[] = []
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true })
})

function target(): string {
  const root = mkdtempSync(join(tmpdir(), 'create-playbook-'))
  roots.push(root)
  return join(root, 'acme-playbook')
}

test('a new playbook passes its own check', () => {
  const t = target()
  create('acme-playbook', t)
  assert.deepEqual(check(t), { errors: [], warnings: [] })
})

test('the name replaces the placeholders and .gitignore is restored', () => {
  const t = target()
  create('acme-playbook', t)
  assert.match(readFileSync(join(t, 'README.md'), 'utf8'), /^# acme-playbook$/m)
  assert.equal(JSON.parse(readFileSync(join(t, 'package.json'), 'utf8')).name, 'acme-playbook')
  assert.ok(existsSync(join(t, '.gitignore')))
  assert.match(readFileSync(join(t, '.playbook', 'config.yaml'), 'utf8'), /^company: acme-playbook$/m)
})

test('an invalid name is refused', () => {
  assert.throws(() => create('Acme Playbook', target()), /invalid name/)
})

test('a new playbook opens in Obsidian with links kept up to date and technical files hidden', () => {
  const t = target()
  create('acme-playbook', t)
  const app = JSON.parse(readFileSync(join(t, '.obsidian', 'app.json'), 'utf8'))
  assert.equal(app.alwaysUpdateLinks, true)
  assert.ok(app.userIgnoreFilters.includes('node_modules/'))
  const ignored = readFileSync(join(t, '.gitignore'), 'utf8')
  assert.match(ignored, /^\.obsidian\/\*$/m)
  assert.match(ignored, /^!\.obsidian\/app\.json$/m)
})
