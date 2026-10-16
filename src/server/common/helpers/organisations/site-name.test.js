import { describe, expect, it } from 'vitest'

import { siteNameOf } from './site-name.js'

/** @import { RegistrationView } from './organisation-view.js' */

const common = {
  status: { current: 'approved', timeline: [] },
  validFrom: '2025-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  accreditations: {}
}

describe(siteNameOf, () => {
  it('names a reprocessing site by the first line of its address', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: {
        address: {
          line1: '7 Glass processing site',
          town: 'London',
          postcode: 'SW1A 1AA'
        }
      }
    })

    expect(siteNameOf(registration)).toBe('7 Glass processing site')
  })

  it('names a reprocessing site by its full address when it has no lines', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: { address: { fullAddress: '7 Glass processing site, London' } }
    })

    expect(siteNameOf(registration)).toBe('7 Glass processing site, London')
  })

  it('names no site for an exporter', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'exporter'
    })

    expect(siteNameOf(registration)).toBeNull()
  })
})
