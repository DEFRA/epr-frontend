import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { AccreditationResource } from '../helpers/types.js'
 */

const localise = createMockLocalise({
  'registrations:details:accreditation:breadcrumb': 'Accreditation details',
  'registrations:details:accreditation:heading': 'Accreditation',
  'registrations:details:accreditation:summary:number': 'Accreditation number',
  'registrations:details:accreditation:summary:status': 'Accreditation status',
  'registrations:details:accreditation:summary:wasteBalanceAvailable':
    'Waste balance available (tonnes)',
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:current': 'Current',
  'registrations:details:period': '{{from}} to {{to}}',
  'registrations:details:heading': 'Registration details'
})

/** @type {(path: string) => string} */
const localiseUrl = (path) => path

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const accreditationId = 'acc-001'

const organisation = /** @type {Organisation} */ (
  /** @type {unknown} */ ({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  })
)

/**
 * @param {Partial<Registration>} [overrides]
 * @returns {Registration}
 */
const aRegistration = (overrides) =>
  /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      ...overrides
    })
  )

/**
 * @param {Partial<AccreditationResource>} [overrides]
 * @returns {AccreditationResource}
 */
const anAccreditation = (overrides) => ({
  id: accreditationId,
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  reprocessingType: 'input',
  dateRange: { validFrom: '2026-07-01', validTo: '2026-12-31' },
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor'
  },
  ...overrides
})

const aWasteBalance = { amount: 1234.5, availableAmount: 987.25 }

/**
 * @param {Partial<AccreditationResource>} [accreditationOverrides]
 * @param {Partial<Registration>} [registrationOverrides]
 * @param {WasteBalance | null} [wasteBalance]
 */
const build = (
  accreditationOverrides,
  registrationOverrides,
  wasteBalance = aWasteBalance
) =>
  buildViewModel({
    organisation,
    registration: aRegistration(registrationOverrides),
    accreditation: anAccreditation(accreditationOverrides),
    wasteBalance,
    localise,
    localiseUrl
  })

describe('the accreditation details view model', () => {
  it('names the organisation, the registration and the accreditation in the caption', () => {
    expect(build().caption).toBe(
      'Kirkby Plastics Ltd - R26ER5001180041PL - A26ER5001180114PL'
    )
  })

  it('leaves a missing number out of the caption rather than showing it empty', () => {
    expect(build({ accreditationNumber: null }).caption).toBe(
      'Kirkby Plastics Ltd - R26ER5001180041PL'
    )
  })

  it('knows an organisation by its trading name where it has one', () => {
    const model = buildViewModel({
      organisation: /** @type {Organisation} */ (
        /** @type {unknown} */ ({
          id: organisationId,
          companyDetails: {
            name: 'Kirkby Plastics Ltd',
            tradingName: 'Kirkby Recycling'
          }
        })
      ),
      registration: aRegistration(),
      accreditation: anAccreditation(),
      wasteBalance: aWasteBalance,
      localise,
      localiseUrl
    })

    expect(model.caption).toContain('Kirkby Recycling')
  })

  it('names the page alone in the heading', () => {
    expect(build().heading).toBe('Accreditation')
  })

  it('names the validity period beneath the heading', () => {
    expect(build().period).toBe('1 July to 31 December 2026')
  })

  it('reads an accreditation with no end date as current', () => {
    expect(
      build({ dateRange: { validFrom: '2026-07-01', validTo: null } }).period
    ).toBe('1 July 2026 to Current')
  })

  it('names no period for an accreditation that has not been approved', () => {
    expect(
      build({ dateRange: { validFrom: null, validTo: null } }).period
    ).toBe('')
  })

  it('shows the status as a tag, then the number, then the available balance', () => {
    expect(build().summaryRows).toStrictEqual([
      {
        key: 'Accreditation status',
        status: { text: 'Approved', classes: 'govuk-tag--green' }
      },
      { key: 'Accreditation number', value: 'A26ER5001180114PL' },
      { key: 'Waste balance available (tonnes)', value: '987.25' }
    ])
  })

  it('shows an empty number for an accreditation that never got one', () => {
    expect(build({ accreditationNumber: null }).summaryRows[1]).toStrictEqual({
      key: 'Accreditation number',
      value: ''
    })
  })

  it('shows a balance of nothing as zero rather than as blank', () => {
    expect(
      build(undefined, undefined, { amount: 0, availableAmount: 0 })
        .summaryRows[2]
    ).toStrictEqual({
      key: 'Waste balance available (tonnes)',
      value: '0.00'
    })
  })

  it('leaves the balance blank when it could not be read', () => {
    expect(build(undefined, undefined, null).summaryRows[2]).toStrictEqual({
      key: 'Waste balance available (tonnes)',
      value: ''
    })
  })

  it('walks back to the registration and the organisation', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: `/organisations/${organisationId}` },
      {
        text: 'Registration details',
        href: `/organisations/${organisationId}/registrations/${registrationId}`
      },
      { text: 'Accreditation details' }
    ])
  })

  it('titles the page by the accreditation number where there is one', () => {
    expect(build().pageTitle).toBe('A26ER5001180114PL: Accreditation details')
  })

  it('falls back to the page name when there is no number', () => {
    expect(build({ accreditationNumber: null }).pageTitle).toBe(
      'Accreditation details'
    )
  })
})
