import { describe, expect, it } from 'vitest'

import { siteLineOf, siteNameOf } from './site-name.js'

/** @import { RegistrationView } from './organisation-view.js' */

const common = {
  status: { current: 'approved', timeline: {} },
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

describe(siteLineOf, () => {
  it('writes a reprocessing site address out on one line', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
      site: {
        address: {
          line1: '7 Glass Lane',
          line2: 'Hunslet',
          town: 'Leeds',
          county: 'West Yorkshire',
          postcode: 'LS10 1AB'
        }
      }
    })

    expect(siteLineOf(registration)).toBe(
      '7 Glass Lane, Hunslet, Leeds, West Yorkshire, LS10 1AB'
    )
  })

  it('leaves out an address part that is missing or blank', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
      site: {
        address: {
          line1: '7 Glass Lane',
          line2: '   ',
          town: 'Leeds',
          postcode: 'LS10 1AB'
        }
      }
    })

    expect(siteLineOf(registration)).toBe('7 Glass Lane, Leeds, LS10 1AB')
  })

  it('shows the address the backend already wrote out', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'reprocessor',
      site: { address: { fullAddress: ' 7 Glass Lane, Leeds LS10 1AB ' } }
    })

    expect(siteLineOf(registration)).toBe('7 Glass Lane, Leeds LS10 1AB')
  })

  it('has no site address for an exporter', () => {
    const registration = /** @type {RegistrationView} */ ({
      ...common,
      wasteProcessingType: 'exporter'
    })

    expect(siteLineOf(registration)).toBeNull()
  })
})
