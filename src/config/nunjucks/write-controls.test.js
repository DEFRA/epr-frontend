import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const templateRoot = path.resolve(import.meta.dirname, '../../server')
const readOnlyCondition = /\bnot isReadOnly\b/

const templates = readdirSync(templateRoot, { recursive: true })
  .map(String)
  .filter((entry) => entry.endsWith('.njk'))

const CONDITION_OR_FORM =
  /{%-?\s*(if|elif|elseif|else|endif)\s*([^%]*?)\s*-?%}|<form/g

/**
 * Lines holding a `<form>` that no enclosing `{% if not isReadOnly %}` covers.
 * Reads each tag in the order it appears, so a condition opened after a form on
 * the same line does not count, and an `{% else %}` or `{% elif %}` drops the
 * condition its branch does not carry. Tracks `{% if %}` nesting only — a form
 * inside a `{% for %}` still has to sit inside the read-only condition.
 * @param {string} source
 * @returns {number[]}
 */
const unguardedFormLines = (source) => {
  /** @type {string[]} */
  const openConditions = []
  /** @type {number[]} */
  const unguarded = []

  source.split('\n').forEach((line, index) => {
    for (const [, tag, condition] of line.matchAll(CONDITION_OR_FORM)) {
      if (tag === 'if') {
        openConditions.push(condition ?? '')
      } else if (tag === 'endif') {
        openConditions.pop()
      } else if (tag) {
        openConditions[openConditions.length - 1] = condition ?? ''
      } else if (!openConditions.some((open) => readOnlyCondition.test(open))) {
        unguarded.push(index + 1)
      }
    }
  })

  return unguarded
}

describe('the scan itself', () => {
  it('accepts a form inside the read-only condition', () => {
    const source = ['{% if not isReadOnly %}', '<form>', '{% endif %}'].join(
      '\n'
    )

    expect(unguardedFormLines(source)).toStrictEqual([])
  })

  it('rejects a form the condition does not cover', () => {
    const source = ['{% if not isReadOnly %}', '{% endif %}', '<form>'].join(
      '\n'
    )

    expect(unguardedFormLines(source)).toStrictEqual([3])
  })

  it('rejects a form in the else branch of the read-only condition', () => {
    const source = [
      '{% if not isReadOnly %}',
      '{% else %}',
      '<form>',
      '{% endif %}'
    ].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([3])
  })

  it('rejects a form in an elif branch of the read-only condition', () => {
    const source = [
      '{% if not isReadOnly %}',
      '{% elif somethingElse %}',
      '<form>',
      '{% endif %}'
    ].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([3])
  })

  it('rejects a form the condition guards only on a later line', () => {
    const source = ['<form>{% if not isReadOnly %}', '{% endif %}'].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([1])
  })
})

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
