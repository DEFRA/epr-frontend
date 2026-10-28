import { describe, expect, it } from 'vitest'

import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'

import { toOrganisationRow } from './to-organisation-row.js'

const acme = {
  organisationNumber: toOrganisationNumber('50002'),
  name: 'ACME ltd',
  status: { current: 'active' },
  submittedToRegulator: { code: 'ea' }
}

// The two localisers share a signature, so a caller could pass them the wrong
// way round and the type checker would not notice. Each one marks its output
// differently, so a swap fails here rather than in a regulator's browser.
/** @param {string} path */
const inEnglish = (path) => `/en${path}`

/** @param {string} key */
const asKey = (key) => `translated:${key}`

describe(toOrganisationRow, () => {
  it('projects an organisation onto the columns the browse table shows', () => {
    expect(toOrganisationRow(acme, inEnglish, asKey)).toStrictEqual({
      name: 'ACME ltd',
      organisationId: '50002',
      regulator: 'EA',
      status: {
        text: 'translated:regulators:organisations:status:active',
        classes: 'govuk-tag--green'
      },
      href: '/en/organisations/50002'
    })
  })

  it('keeps the language the regulator is reading in', () => {
    expect(toOrganisationRow(acme, (path) => `/cy${path}`, asKey).href).toBe(
      '/cy/organisations/50002'
    )
  })

  it('names the regulator the way a regulator writes it', () => {
    expect(
      toOrganisationRow(
        { ...acme, submittedToRegulator: { code: 'nrw' } },
        inEnglish,
        asKey
      ).regulator
    ).toBe('NRW')
  })
})
