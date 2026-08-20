import { describe, expect, it } from 'vitest'

import { toOrganisationRow } from './to-organisation-row.js'

const acme = {
  id: '6507f1f77bcf86cd79943901',
  orgId: 50002,
  companyDetails: { name: 'ACME ltd' },
  status: 'active',
  submittedToRegulator: 'ea'
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
      href: '/en/organisations/6507f1f77bcf86cd79943901'
    })
  })

  it('keeps the language the regulator is reading in', () => {
    expect(toOrganisationRow(acme, (path) => `/cy${path}`, asKey).href).toBe(
      '/cy/organisations/6507f1f77bcf86cd79943901'
    )
  })

  it('names the regulator the way a regulator writes it', () => {
    expect(
      toOrganisationRow(
        { ...acme, submittedToRegulator: 'nrw' },
        inEnglish,
        asKey
      ).regulator
    ).toBe('NRW')
  })

  it('leaves the regulator blank when the organisation names none', () => {
    expect(
      toOrganisationRow(
        { ...acme, submittedToRegulator: undefined },
        inEnglish,
        asKey
      ).regulator
    ).toBe('')
  })
})
