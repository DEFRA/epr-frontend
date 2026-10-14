import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { OrganisationView, RegistrationView } from './helpers/fetch-overseas-sites.js'
 */

const localise = createMockLocalise({
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:heading': 'Registration details',
  'registrations:details:overseasSites:heading': 'Overseas reprocessing sites'
})

const registrationNumber = 'R26ER5001180041PL'

/** @type {RegistrationView} */
const aRegistration = {
  material: 'plastic',
  overseasSites: {
    '007': {
      name: 'Bahia Plásticos',
      address: {
        country: 'Brazil',
        line1: 'Rua das Palmeiras 12',
        line2: 'Distrito Industrial',
        townOrCity: 'Salvador',
        stateOrRegion: 'Bahia',
        postcode: '40000-000'
      },
      coordinates: '-12.9777, -38.5016'
    }
  }
}

/**
 * @param {Partial<OrganisationView>} [overrides]
 * @returns {OrganisationView}
 */
const anOrganisation = (overrides) => ({
  name: 'Kirkby Plastics Ltd',
  organisationNumber: 500123,
  registrations: { [registrationNumber]: aRegistration },
  ...overrides
})

/**
 * @param {{
 *   organisation?: OrganisationView,
 *   registration?: RegistrationView
 * }} [overrides]
 */
const viewModel = ({ organisation, registration } = {}) =>
  buildViewModel({
    organisation: organisation ?? anOrganisation(),
    registrationNumber,
    registration: registration ?? aRegistration,
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

    it('names glass by the process it is recycled through', () => {
      const model = viewModel({
        registration: { ...aRegistration, material: 'glass_re_melt' }
      })

      expect(categoryOf(model)).toBe('Glass remelt')
    })
  })

  it('lists no sites for a registration that names none', () => {
    const model = viewModel({ registration: { material: 'plastic' } })

    expect(model.sites.rows).toStrictEqual([])
  })

  // The two pages above have not moved to natural keys yet, so these links
  // reach them through the redirect.
  it('walks the records the page sits under by number, ending on itself', () => {
    const { breadcrumbs } = viewModel()

    expect(breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: '/organisations/500123' },
      {
        text: 'Registration details',
        href: `/organisations/500123/registrations/${registrationNumber}`
      },
      { text: 'Overseas reprocessing sites' }
    ])
  })

  it('names the page by its registration number', () => {
    expect(viewModel().pageTitle).toBe(
      'R26ER5001180041PL: Overseas reprocessing sites'
    )
  })
})
