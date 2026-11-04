import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { nunjucksConfig } from '#config/nunjucks/nunjucks.js'

const templateRoot = path.resolve(import.meta.dirname, '../../server')

const WRITE_SCOPE = 'hasWriteScope'
const CONJUNCTION = /\band\b/
const PLAIN_TERM = /^[\w.]+$/

/**
 * Whether a condition guards a write control. A condition guards only if it
 * requires the flag, and it requires the flag only when it is a conjunction of
 * plain names, one of which is the flag. `{% if issueButton and hasWriteScope %}`
 * guards. Anything the flag cannot single-handedly veto does not.
 *
 * The rule states the shape a guard must have rather than listing the shapes it
 * must not, because a list is wrong the moment someone writes a spelling that
 * is not on it. Every one of these mentions the flag and renders the control to
 * a session that holds no write scope:
 *
 * `{% if not hasWriteScope %}`, `{% if not (hasWriteScope) %}`,
 * `{% if hasWriteScope == false %}`, `{% if hasWriteScope or true %}`,
 * `{% if ready or draft and hasWriteScope %}`.
 *
 * The last one is why a term has to be a plain name rather than any expression.
 * Nunjucks binds `and` tighter than `or`, so that condition reads
 * `ready or (draft and hasWriteScope)` and renders the control whenever `ready`
 * is true, whatever the scope says.
 *
 * A guard that legitimately needs another shape will turn up one day — copy
 * that only a session without the scope sees, or a bracketed expression. Name
 * it as an exemption with a stated reason, the way `READ_METHOD` and
 * `OVERRIDDEN_METHOD` are named below. Do not loosen this to a test for the
 * name alone.
 * @param {string} condition
 * @returns {boolean}
 */
const guardsWrites = (condition) => {
  const terms = condition.split(CONJUNCTION).map((term) => term.trim())

  return (
    terms.every((term) => PLAIN_TERM.test(term)) && terms.includes(WRITE_SCOPE)
  )
}

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
  /{%-?\s*(if|elif|elseif|else|endif)\s*([^%]*?)\s*-?%}|<form([^>]*)/g

const READ_METHOD = /\smethod\s*=\s*"get"/i
const OVERRIDDEN_METHOD = /formmethod/i

/**
 * Recording a cookie choice is a write that a session holding no write scope
 * has to be able to submit, because consent is asked of a signed-out visitor
 * before anything is set. It changes how the browser is treated rather than
 * what the service holds, and never reaches the backend, so the write scope has
 * nothing to say about it. `blockUnauthorisedWrites` exempts the same path for
 * the same reason.
 *
 * Keyed on the exact action rather than on the template or a class name, so it
 * covers this one form and nothing that grows up beside it.
 */
const CONSENT_FORM = /\saction\s*=\s*"\/cookies\/consent"/i

/**
 * Lines holding a `<form>` that no enclosing `{% if hasWriteScope %}` covers.
 * Reads each tag in the order it appears, so a condition opened after a form on
 * the same line does not count, and an `{% else %}` or `{% elif %}` drops the
 * condition its branch does not carry. Tracks `{% if %}` nesting only — a form
 * inside a `{% for %}` still has to sit inside the write-scope condition.
 *
 * A form that declares `method="get"` is a read and needs no condition, so a
 * search a session holding no write scope is meant to use does not have to hide
 * itself from that session. `blockUnauthorisedWrites` draws the same line one
 * notch wider: it lets a read through, and refuses a write from a session
 * holding no write scope.
 *
 * The exemption reads a form's stated intent and proves nothing about where it
 * submits. Nothing here checks that the `action` reaches a route that only
 * answers a GET, so for a GET form this scan is advisory and the runtime guard
 * is what holds the line.
 *
 * The attribute has to be the form's own `method`, written out on the form's
 * own line: a form that says nothing about its method counts as a write, and so
 * does one whose only `get` sits in an attribute that merely ends in `method`.
 *
 * A submit button carrying `formmethod` overrides the form's own method, so a
 * template that mentions `formmethod` anywhere loses the exemption for every
 * form in it. That is blunt, and it is the fail-closed direction.
 *
 * A tag must sit on one line. Split an `{% if %}` across two and the scan does
 * not see it while its `{% endif %}` still closes the enclosing condition, so
 * the template fails this check rather than passing it quietly. Write the
 * condition on one line.
 *
 * A condition that does not require the flag does not count — see
 * `guardsWrites`.
 * @param {string} source
 * @returns {number[]}
 */
const unguardedFormLines = (source) => {
  /** @type {string[]} */
  const openConditions = []
  /** @type {number[]} */
  const unguarded = []
  const exemptsReads = !OVERRIDDEN_METHOD.test(source)

  source.split('\n').forEach((line, index) => {
    for (const [, tag, condition, formAttributes] of line.matchAll(
      CONDITION_OR_FORM
    )) {
      if (tag === 'if') {
        openConditions.push(condition ?? '')
      } else if (tag === 'endif') {
        openConditions.pop()
      } else if (tag) {
        openConditions[openConditions.length - 1] = condition ?? ''
      } else if (
        !(exemptsReads && READ_METHOD.test(formAttributes ?? '')) &&
        !CONSENT_FORM.test(formAttributes ?? '') &&
        !openConditions.some(guardsWrites)
      ) {
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
    const readsContext = /<form|hasWriteScope/.test(macroSource ?? '')

    if (readsContext && !/\bwith context\b/.test(imported[2] ?? '')) {
      missing.push(index + 1)
    }
  })

  return missing
}

describe('the import scan itself', () => {
  const readsContext = () => '{% if hasWriteScope %}<form>{% endif %}'
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
  it('accepts a form inside the write-scope condition', () => {
    const source = ['{% if hasWriteScope %}', '<form>', '{% endif %}'].join(
      '\n'
    )

    expect(unguardedFormLines(source)).toStrictEqual([])
  })

  it('rejects a form the condition does not cover', () => {
    const source = ['{% if hasWriteScope %}', '{% endif %}', '<form>'].join(
      '\n'
    )

    expect(unguardedFormLines(source)).toStrictEqual([3])
  })

  it('rejects a form in the else branch of the write-scope condition', () => {
    const source = [
      '{% if hasWriteScope %}',
      '{% else %}',
      '<form>',
      '{% endif %}'
    ].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([3])
  })

  it('rejects a form in an elif branch of the write-scope condition', () => {
    const source = [
      '{% if hasWriteScope %}',
      '{% elif somethingElse %}',
      '<form>',
      '{% endif %}'
    ].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([3])
  })

  it('accepts a form that reads, which is what a GET form does', () => {
    expect(unguardedFormLines('<form method="get" action="">')).toStrictEqual(
      []
    )
  })

  it('rejects a form that says nothing about its method', () => {
    expect(unguardedFormLines('<form action="">')).toStrictEqual([1])
  })

  it('rejects a form whose only get sits in another attribute', () => {
    expect(
      unguardedFormLines('<form data-method="get" method="post">')
    ).toStrictEqual([1])
  })

  it('rejects a GET form whose button overrides the method', () => {
    const source = [
      '<form method="get">',
      '<button formmethod="post">Go</button>',
      '</form>'
    ].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([1])
  })

  it('accepts a form the flag guards alongside another term', () => {
    const source = [
      '{% if issueButton and hasWriteScope %}',
      '<form>',
      '{% endif %}'
    ].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([])
  })

  it.for([
    '{% if not hasWriteScope %}',
    '{% if not  hasWriteScope %}',
    '{% if not (hasWriteScope) %}',
    '{% if hasWriteScope == false %}',
    '{% if hasWriteScope or true %}',
    '{% if ready or draft and hasWriteScope %}'
  ])('rejects a form that %s covers', (opening) => {
    const source = [opening, '<form>', '{% endif %}'].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([2])
  })

  it('rejects a form the condition guards only on a later line', () => {
    const source = ['<form>{% if hasWriteScope %}', '{% endif %}'].join('\n')

    expect(unguardedFormLines(source)).toStrictEqual([1])
  })
})

describe('write controls in templates', () => {
  it('finds the templates to check', () => {
    expect(templates.length).toBeGreaterThan(0)
  })

  it.for(templates)(
    'hides every form in %s from a session holding no write scope',
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

/**
 * Renders the summary log upload macro in the environment the app itself
 * builds, so the filters, globals and template roots are the running ones
 * rather than a second set that has to be kept in step.
 *
 * The scans above read source and prove only that a guard was written. This
 * renders one to prove which way it falls.
 * @param {{ context?: Record<string, unknown>, withContext?: boolean }} options
 * @returns {string}
 */
const renderUploadMacro = ({ context = {}, withContext = true }) =>
  nunjucksConfig.options.compileOptions.environment.renderString(
    [
      `{% from "summary-log-upload/macro.njk" import summaryLogUpload ${withContext ? 'with context' : ''} %}`,
      '{{ summaryLogUpload({ uploadUrl: "/upload", fileUploadLabel: "Choose XLSX file", buttonText: "Continue" }) }}'
    ].join('\n'),
    context
  )

describe('the guard a template renders', () => {
  it('offers the write control to a context holding the write scope', () => {
    expect(renderUploadMacro({ context: { hasWriteScope: true } })).toContain(
      '<form'
    )
  })

  it('hides the write control from a context that names no write scope', () => {
    expect(renderUploadMacro({ context: {} })).not.toContain('<form')
  })

  // The defect the positive polarity exists to survive. A macro reads its
  // caller's context only when the import says `with context`, so dropping that
  // leaves the flag undefined inside the macro. Under the old negative guard
  // the control rendered to everyone; under this one it disappears.
  it('hides the write control from a macro imported without context', () => {
    expect(
      renderUploadMacro({
        context: { hasWriteScope: true },
        withContext: false
      })
    ).not.toContain('<form')
  })
})
