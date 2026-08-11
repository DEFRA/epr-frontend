import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const templateRoot = path.resolve(import.meta.dirname, '../../server')
const readOnlyCondition = /\bnot isReadOnly\b/

const templates = readdirSync(templateRoot, { recursive: true })
  .map(String)
  .filter((entry) => entry.endsWith('.njk'))

/**
 * Lines holding a `<form>` that no enclosing `{% if not isReadOnly %}` covers.
 * Tracks `{% if %}` nesting only — a form inside a `{% for %}` still has to
 * sit inside the read-only condition to count as guarded.
 * @param {string} source
 * @returns {number[]}
 */
const unguardedFormLines = (source) => {
  /** @type {string[]} */
  const openConditions = []
  /** @type {number[]} */
  const unguarded = []

  source.split('\n').forEach((line, index) => {
    const opened = /{%-?\s*if\s+([^%]*?)\s*-?%}/.exec(line)

    if (opened) {
      openConditions.push(opened[1] ?? '')
    }

    const guarded = openConditions.some((condition) =>
      readOnlyCondition.test(condition)
    )

    if (line.includes('<form') && !guarded) {
      unguarded.push(index + 1)
    }

    if (/{%-?\s*endif\s*-?%}/.test(line)) {
      openConditions.pop()
    }
  })

  return unguarded
}

describe('write controls in templates', () => {
  it('finds the templates to check', () => {
    expect(templates.length).toBeGreaterThan(0)
  })

  it.for(templates)(
    'hides every form in %s from a read-only session',
    (template) => {
      const source = readFileSync(path.join(templateRoot, template), 'utf-8')

      expect(unguardedFormLines(source)).toStrictEqual([])
    }
  )
})
