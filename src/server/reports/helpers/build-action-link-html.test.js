import { describe, expect, it } from 'vitest'

import { buildActionLinkHtml } from './build-action-link-html.js'

describe(buildActionLinkHtml, () => {
  it('links to the action, naming the row it acts on for a reader who cannot see it', () => {
    expect(
      buildActionLinkHtml(
        'View report',
        '/reports/2026/monthly/8',
        'August, 2026'
      )
    ).toBe(
      '<a href="/reports/2026/monthly/8" class="govuk-link">View report <span class="govuk-visually-hidden">August, 2026</span></a>'
    )
  })

  it('escapes the action label', () => {
    expect(
      buildActionLinkHtml('View <report>', '/reports', 'August, 2026')
    ).toContain('View &lt;report&gt;')
  })

  it('escapes the hidden label', () => {
    expect(
      buildActionLinkHtml('View report', '/reports', 'August & "2026"')
    ).toContain('August &amp; &quot;2026&quot;')
  })
})
