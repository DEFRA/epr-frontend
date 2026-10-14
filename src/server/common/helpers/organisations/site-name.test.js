import { describe, expect, it } from 'vitest'

import { siteNameOf } from './site-name.js'

/** @import { RegistrationView } from './organisation-view.js' */

const common = {
  status: 'approved',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  accreditations: {}
}

describe(siteNameOf, () => {
  it('names a reprocessing site by the first line of its address', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
      site: { address: { line1: '7 Glass processing site' } }
    })

    expect(siteNameOf(registration)).toBe('7 Glass processing site')
  })

  it('names a reprocessing site by its full address when it has no lines', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
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
