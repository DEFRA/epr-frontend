import { describe, expect, it } from 'vitest'

import { toStatusTag } from './to-status-tag.js'

/** @param {string} key */
const inEnglish = (key) => key

describe(toStatusTag, () => {
  const designed = [
    { status: 'created', classes: '' },
    { status: 'approved', classes: 'govuk-tag--turquoise' },
    { status: 'active', classes: 'govuk-tag--green' },
    { status: 'rejected', classes: 'govuk-tag--red' }
  ]

  it.for(designed)(
    'colours $status the way the design does',
    ({ status, classes }) => {
      expect(toStatusTag(status, inEnglish)).toStrictEqual({
        text: `regulators:organisations:status:${status}`,
        classes
      })
    }
  )

  it('shows a status it does not know rather than an empty cell', () => {
    expect(toStatusTag('dissolved', inEnglish)).toStrictEqual({
      text: 'dissolved',
      classes: 'govuk-tag--grey'
    })
  })
})
