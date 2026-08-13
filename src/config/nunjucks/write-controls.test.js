import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const templateRoot = path.resolve(import.meta.dirname, '../../server')
const readOnlyCondition = /\bnot isReadOnly\b/

const templates = readdirSync(templateRoot, { recursive: true })
  .map(String)
  .filter((entry) => entry.endsWith('.njk'))

/**
 * Resolves an import against the app's own template roots, the way nunjucks
 * does. Returns null for a path outside them, which is how a govuk-frontend
 * import falls out of the check.
 * @param {string} templatePath
 * @returns {string | null}
 */
const readComponent = (templatePath) => {
  const roots = [
    path.join(templateRoot, 'common/components'),
    path.join(templateRoot, 'common/templates')
  ]

  for (const root of roots) {
    const candidate = path.join(root, templatePath)

    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8')
    }
  }

  return null
}

const CONDITION_OR_FORM =
  /{%-?\s*(if|elif|elseif|else|endif)\s*([^%]*?)\s*-?%}|<form/g

/**
 * Lines holding a `<form>` that no enclosing `{% if not isReadOnly %}` covers.
 * Reads each tag in the order it appears, so a condition opened after a form on
 * the same line does not count, and an `{% else %}` or `{% elif %}` drops the
 * condition its branch does not carry. Tracks `{% if %}` nesting only — a form
 * inside a `{% for %}` still has to sit inside the read-only condition.
 *
 * A tag must sit on one line. Split an `{% if %}` across two and the scan does
 * not see it while its `{% endif %}` still closes the enclosing condition, so
 * the template fails this check rather than passing it quietly. Write the
 * condition on one line.
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

const MACRO_IMPORT = /{%-?\s*(?:from|import)\s+"([^"]+)"([^%]*?)-?%}/

/**
 * Lines importing a macro that reads the template context without `with
 * context`. A macro cannot see its caller's context otherwise, so a condition
 * inside it silently evaluates as though the variable were false: the form
 * renders for everyone and the form scan above still passes.
 * @param {string} source
 * @param {(templatePath: string) => string | null} readImported
 * @returns {number[]}
 */
const macroImportsMissingContext = (source, readImported) => {
  /** @type {number[]} */
  const missing = []

  source.split('\n').forEach((line, index) => {
    const imported = MACRO_IMPORT.exec(line)

    if (!imported) {
      return
    }

    const macroSource = readImported(imported[1] ?? '')
    const readsContext = /<form|isReadOnly/.test(macroSource ?? '')

    if (readsContext && !/\bwith context\b/.test(imported[2] ?? '')) {
      missing.push(index + 1)
    }
  })

  return missing
}

describe('the import scan itself', () => {
  const readsContext = () => '{% if not isReadOnly %}<form>{% endif %}'
  const readsNothing = () => '<p>{{ params.text }}</p>'

  it('accepts an import of a macro that reads no context', () => {
    const source = '{% from "plain/macro.njk" import plain %}'

    expect(macroImportsMissingContext(source, readsNothing)).toStrictEqual([])
  })

  it('accepts a context-reading macro imported with context', () => {
    const source = '{% from "x/macro.njk" import x with context %}'

    expect(macroImportsMissingContext(source, readsContext)).toStrictEqual([])
  })

  it('rejects a context-reading macro imported without context', () => {
    const source = '{% from "x/macro.njk" import x %}'

    expect(macroImportsMissingContext(source, readsContext)).toStrictEqual([1])
  })

  it('ignores an import it cannot resolve', () => {
    const source = '{% from "govuk/components/button/macro.njk" import b %}'

    expect(macroImportsMissingContext(source, () => null)).toStrictEqual([])
  })
})

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

  it.for(templates)(
    'gives every context-reading macro %s imports the calling context',
    (template) => {
      const source = readFileSync(path.join(templateRoot, template), 'utf-8')

      expect(macroImportsMissingContext(source, readComponent)).toStrictEqual(
        []
      )
    }
  )
})
