import { describe, expect, it } from 'vitest'

import { toOrganisationRow } from './to-organisation-row.js'

const acme = {
  id: '6507f1f77bcf86cd79943901',
  orgId: 50002,
  companyDetails: { name: 'ACME ltd' },
  status: 'active',
  submittedToRegulator: 'ea'
}

const inEnglish = (path) => path

describe(toOrganisationRow, () => {
  it('projects an organisation onto the columns the results table shows', () => {
    expect(toOrganisationRow(acme, inEnglish)).toStrictEqual({
      name: 'ACME ltd',
      organisationId: '50002',
      regulator: 'EA',
      status: 'active',
      href: '/organisations/6507f1f77bcf86cd79943901'
    })
  })

  it('keeps the language the regulator is reading in', () => {
    expect(toOrganisationRow(acme, (path) => `/cy${path}`).href).toBe(
      '/cy/organisations/6507f1f77bcf86cd79943901'
    )
  })

  it('names the regulator the way a regulator writes it', () => {
    expect(
      toOrganisationRow({ ...acme, submittedToRegulator: 'nrw' }, inEnglish)
        .regulator
    ).toBe('NRW')
  })

  it('leaves the regulator blank when the organisation names none', () => {
    expect(
      toOrganisationRow({ ...acme, submittedToRegulator: undefined }, inEnglish)
        .regulator
    ).toBe('')
  })
})
