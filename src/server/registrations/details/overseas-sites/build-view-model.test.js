import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { OverseasSitesById } from './helpers/fetch-overseas-sites.js'
 */

const localise = createMockLocalise({
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:heading': 'Registration details',
  'registrations:details:overseasSites:heading': 'Overseas reprocessing sites'
})

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'

/**
 * @param {Partial<Organisation['companyDetails']>} [companyDetails]
 * @returns {Organisation}
 */
const anOrganisation = (companyDetails) =>
  /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      companyDetails: { name: 'Kirkby Plastics Ltd', ...companyDetails }
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
      status: 'approved',
      material: 'plastic',
      ...overrides
    })
  )

/** @type {OverseasSitesById} */
const oneSite = {
  '007': {
    name: 'Bahia Plásticos',
    country: 'Brazil',
    address: {
      line1: 'Rua das Palmeiras 12',
      line2: 'Distrito Industrial',
      townOrCity: 'Salvador',
      stateOrRegion: 'Bahia',
      postcode: '40000-000'
    },
    coordinates: '-12.9777, -38.5016'
  }
}

/**
 * @param {{
 *   organisation?: Organisation,
 *   registration?: Registration,
 *   sites?: OverseasSitesById
 * }} [overrides]
 */
const viewModel = ({ organisation, registration, sites } = {}) =>
  buildViewModel({
    organisation: organisation ?? anOrganisation(),
    registration: registration ?? aRegistration(),
    sites: sites ?? oneSite,
    localise,
    localiseUrl: (path) => path
  })

describe(buildViewModel, () => {
  describe('the name it knows the organisation by', () => {
    // An organisation that trades under another name is known by it, so the
    // regulator reads the name they would recognise rather than the registered
    // one. The two pages above this resolve it the same way.
    it('prefers the trading name where the organisation has one', () => {
      const { caption, breadcrumbs } = viewModel({
        organisation: anOrganisation({ tradingName: 'Kirkby Plastics' })
      })

      expect(caption).toBe('Kirkby Plastics - R26ER5001180041PL')
      expect(breadcrumbs[1].text).toBe('Kirkby Plastics')
    })

    it('falls back to the registered name where the trading name is blank', () => {
      const { caption } = viewModel({
        organisation: anOrganisation({ tradingName: '   ' })
      })

      expect(caption).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
    })

    it('falls back to the registered name where there is no trading name', () => {
      const { caption } = viewModel()

      expect(caption).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
    })
  })

  describe('the packaging waste category', () => {
    /** @param {ReturnType<typeof viewModel>} model */
    const categoryOf = (model) => model.sites.rows[0][1].text

    it('names the material the registration covers', () => {
      expect(categoryOf(viewModel())).toBe('Plastic')
    })

    // Glass is recorded coarsely on the registration and resolved by the
    // process it is recycled through, which is what the registration page above
    // shows. Both pages have to name it the same way.
    it('names glass by the process it is recycled through', () => {
      const model = viewModel({
        registration: aRegistration({
          material: 'glass',
          glassRecyclingProcess: ['glass_re_melt']
        })
      })

      expect(categoryOf(model)).toBe('Glass remelt')
    })
  })

  it('walks the records the page sits under, ending on itself', () => {
    const { breadcrumbs } = viewModel()

    expect(breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: `/organisations/${organisationId}` },
      {
        text: 'Registration details',
        href: `/organisations/${organisationId}/registrations/${registrationId}`
      },
      { text: 'Overseas reprocessing sites' }
    ])
  })

  it('names the page by its registration number', () => {
    expect(viewModel().pageTitle).toBe(
      'R26ER5001180041PL: Overseas reprocessing sites'
    )
  })

  // A registration is numbered when it is approved, so one that is not carries
  // nothing to name the page by.
  it('names an unnumbered registration by the page alone', () => {
    const model = viewModel({
      registration: aRegistration({ registrationNumber: undefined })
    })

    expect(model.pageTitle).toBe('Overseas reprocessing sites')
    expect(model.caption).toBe('Kirkby Plastics Ltd')
  })
})
