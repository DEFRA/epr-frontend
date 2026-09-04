import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildViewModel } from './build-view-model.js'

// Only the keys these assertions read are translated. The rendered copy is
// asserted against the real en.json by the page's integration test.
const localise = createMockLocalise({
  'registrations:details:current': 'Current',
  'registrations:details:period': '{{from}} to {{to}}',
  'registrations:details:heading': 'Registration details',
  'registrations:details:summary:material': 'Material',
  'registrations:details:summary:site': 'Site'
})

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource } from './helpers/types.js'
 * @import { RegistrationResource, SiteAddress } from '#server/common/helpers/organisations/registration-resource.js'
 */

const organisationId = '6507f1f77bcf86cd79943901'
const organisation = /** @type {Organisation} */ (
  /** @type {unknown} */ ({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  })
)

/**
 * @param {SiteAddress | null} address
 * @returns {RegistrationResource}
 */
const aRegistrationWithSite = (address) => ({
  id: 'reg-001',
  organisation: { id: organisationId },
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  material: 'plastic',
  reprocessingType: 'input',
  dateRange: { validFrom: '2026-01-01' },
  accreditations: [],
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    site: address === null ? null : { address }
  }
})

/**
 * @param {Partial<AccreditationResource>} overrides
 * @returns {AccreditationResource}
 */
const anAccreditation = (overrides) => ({
  id: 'acc-001',
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  reprocessingType: 'input',
  dateRange: { validFrom: '2026-07-01', validTo: null },
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor'
  },
  ...overrides
})

/**
 * @param {{
 *   registration?: RegistrationResource,
 *   accreditations?: AccreditationResource[]
 * }} [overrides]
 */
const build = ({ registration, accreditations } = {}) =>
  buildViewModel({
    organisation,
    registration: registration ?? aRegistrationWithSite({ line1: 'Unit 4' }),
    accreditations: accreditations ?? [],
    localise,
    localiseUrl: (path) => path
  })

/**
 * @param {ReturnType<typeof build>} viewModel
 * @param {number} index
 */
const accreditedPeriod = (viewModel, index) => {
  const period = viewModel.accreditedPeriods[index]

  if (!period) {
    throw new Error(`expected an accredited period at ${index}`)
  }

  return period
}

/**
 * @param {ReturnType<typeof build>} viewModel
 * @param {number} index
 */
const breadcrumb = (viewModel, index) => {
  const crumb = viewModel.breadcrumbs[index]

  if (!crumb) {
    throw new Error(`expected a breadcrumb at ${index}`)
  }

  return crumb
}

/**
 * @param {ReturnType<typeof build>} viewModel
 * @param {string} key
 */
const summaryValue = (viewModel, key) => {
  const row = viewModel.summaryRows.find((candidate) => candidate.key === key)

  return row && 'value' in row ? row.value : undefined
}

describe(buildViewModel, () => {
  describe('the site line', () => {
    it('joins the parts the address holds', () => {
      const viewModel = build({
        registration: aRegistrationWithSite({
          line1: 'Unit 4 Mill Road',
          line2: 'Hunslet',
          town: 'Leeds',
          county: 'West Yorkshire',
          postcode: 'LS10 1AB'
        })
      })

      expect(summaryValue(viewModel, 'Site')).toBe(
        'Unit 4 Mill Road, Hunslet, Leeds, West Yorkshire, LS10 1AB'
      )
    })

    it('prefers the address the backend already wrote out', () => {
      const viewModel = build({
        registration: aRegistrationWithSite({
          line1: 'Unit 4 Mill Road',
          town: 'Leeds',
          fullAddress: 'Unit 4 Mill Road, Leeds LS10 1AB'
        })
      })

      expect(summaryValue(viewModel, 'Site')).toBe(
        'Unit 4 Mill Road, Leeds LS10 1AB'
      )
    })

    it('leaves out a part the address holds as blank', () => {
      const viewModel = build({
        registration: aRegistrationWithSite({
          line1: 'Unit 4 Mill Road',
          line2: '   ',
          town: 'Leeds'
        })
      })

      expect(summaryValue(viewModel, 'Site')).toBe('Unit 4 Mill Road, Leeds')
    })

    it('falls back to the parts when the written address is blank', () => {
      const viewModel = build({
        registration: aRegistrationWithSite({
          line1: 'Unit 4 Mill Road',
          fullAddress: '  '
        })
      })

      expect(summaryValue(viewModel, 'Site')).toBe('Unit 4 Mill Road')
    })
  })

  describe('the date range of an accredited period', () => {
    it('names the present where the accreditation is still running', () => {
      const viewModel = build({
        accreditations: [
          anAccreditation({
            dateRange: { validFrom: '2026-07-01', validTo: null }
          })
        ]
      })

      expect(accreditedPeriod(viewModel, 0).dateRange).toBe(
        '1 July 2026 to Current'
      )
    })

    it('is empty where the accreditation never carried dates', () => {
      const viewModel = build({
        accreditations: [
          anAccreditation({ dateRange: { validFrom: null, validTo: null } })
        ]
      })

      expect(accreditedPeriod(viewModel, 0).dateRange).toBe('')
    })
  })

  describe('the material', () => {
    it('is the one the registration resolved to', () => {
      const registration = aRegistrationWithSite({ line1: 'Unit 4' })
      const viewModel = build({
        registration: {
          ...registration,
          material: 'glass_re_melt',
          application: { ...registration.application, material: 'glass' }
        }
      })

      expect(summaryValue(viewModel, 'Material')).toBe('Glass remelt')
    })

    it('is what was applied for where the registration resolved to none', () => {
      const { material: _material, ...unresolved } = aRegistrationWithSite({
        line1: 'Unit 4'
      })
      const viewModel = build({
        registration: {
          ...unresolved,
          application: { ...unresolved.application, material: 'glass' }
        }
      })

      expect(summaryValue(viewModel, 'Material')).toBe('Glass')
    })
  })

  describe('the organisation', () => {
    it('is named by its own name where it trades under none', () => {
      expect(breadcrumb(build(), 1).text).toBe('Kirkby Plastics Ltd')
    })

    it('is named by its own name where the trading name is blank', () => {
      const viewModel = buildViewModel({
        organisation: /** @type {Organisation} */ (
          /** @type {unknown} */ ({
            id: organisationId,
            companyDetails: { name: 'Kirkby Plastics Ltd', tradingName: '  ' }
          })
        ),
        registration: aRegistrationWithSite({ line1: 'Unit 4' }),
        accreditations: [],
        localise,
        localiseUrl: (path) => path
      })

      expect(breadcrumb(viewModel, 1).text).toBe('Kirkby Plastics Ltd')
    })
  })

  describe('a registration that was never approved', () => {
    it('is captioned by the organisation alone', () => {
      const registration = aRegistrationWithSite({ line1: 'Unit 4' })
      const viewModel = build({
        registration: {
          ...registration,
          registrationNumber: null,
          status: 'created'
        }
      })

      expect(viewModel.caption).toBe('Kirkby Plastics Ltd')
      expect(viewModel.pageTitle).toBe('Registration details')
    })
  })

  it('sorts an accreditation that never started last', () => {
    const viewModel = build({
      accreditations: [
        anAccreditation({
          id: 'acc-none',
          accreditationNumber: 'A26ER5001180001PL',
          dateRange: { validFrom: null, validTo: null }
        }),
        anAccreditation({
          id: 'acc-dated',
          accreditationNumber: 'A26ER5001180114PL',
          dateRange: { validFrom: '2026-07-01', validTo: null }
        })
      ]
    })

    expect(
      viewModel.accreditedPeriods.map(({ number }) => number)
    ).toStrictEqual(['A26ER5001180114PL', 'A26ER5001180001PL'])
  })

  it('keeps every accreditation that never started', () => {
    const viewModel = build({
      accreditations: [
        anAccreditation({
          id: 'acc-a',
          accreditationNumber: 'A26ER5001180001PL',
          dateRange: { validFrom: null, validTo: null }
        }),
        anAccreditation({
          id: 'acc-b',
          accreditationNumber: 'A26ER5001180002PL',
          dateRange: { validFrom: null, validTo: null }
        })
      ]
    })

    expect(viewModel.accreditedPeriods).toHaveLength(2)
  })

  describe('registered-only periods', () => {
    // The clock decides how many years a live registration has run over, so it
    // is pinned rather than read.
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('offers a year per year the registration has run, most recent first', () => {
      const viewModel = build({
        registration: {
          ...aRegistrationWithSite({ line1: 'Unit 4' }),
          dateRange: { validFrom: '2024-06-01' }
        }
      })

      expect(viewModel.registeredOnlyPeriods).toStrictEqual([
        {
          year: '2026',
          href: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001/registered-only-periods/2026'
        },
        {
          year: '2025',
          href: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001/registered-only-periods/2025'
        },
        {
          year: '2024',
          href: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001/registered-only-periods/2024'
        }
      ])
    })

    it('offers no year for a registration that was never approved', () => {
      const viewModel = build({
        registration: {
          ...aRegistrationWithSite({ line1: 'Unit 4' }),
          dateRange: { validFrom: null }
        }
      })

      expect(viewModel.registeredOnlyPeriods).toStrictEqual([])
    })

    // A year the accreditation covered entirely still gets a row. The page it
    // opens is what says the period holds nothing.
    it('offers a year the registration held an accreditation for throughout', () => {
      const viewModel = build({
        registration: {
          ...aRegistrationWithSite({ line1: 'Unit 4' }),
          dateRange: { validFrom: '2026-01-01' }
        },
        accreditations: [
          anAccreditation({
            dateRange: { validFrom: '2026-01-01', validTo: null }
          })
        ]
      })

      expect(
        viewModel.registeredOnlyPeriods.map(({ year }) => year)
      ).toStrictEqual(['2026'])
    })

    // Registrations do not expire, so an end date the backend still sends must
    // not offer a regulator a year that has not started.
    it('ignores a registration validTo in the future', () => {
      const viewModel = build({
        registration: {
          ...aRegistrationWithSite({ line1: 'Unit 4' }),
          dateRange: { validFrom: '2026-01-01' }
        }
      })

      expect(
        viewModel.registeredOnlyPeriods.map(({ year }) => year)
      ).toStrictEqual(['2026'])
    })

    // The accredited table is what a regulator already reads here, so adding a
    // second one beside it has to leave the first untouched.
    it('leaves the accredited periods exactly as they were', () => {
      const viewModel = build({
        registration: {
          ...aRegistrationWithSite({ line1: 'Unit 4' }),
          dateRange: { validFrom: '2026-01-01' }
        },
        accreditations: [
          anAccreditation({
            accreditationNumber: 'A26ER5001180114PL',
            dateRange: { validFrom: '2026-03-01', validTo: null }
          })
        ]
      })

      expect(viewModel.accreditedPeriods).toStrictEqual([
        {
          number: 'A26ER5001180114PL',
          dateRange: '1 March 2026 to Current',
          status: toStatusTag('approved'),
          href: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001/accreditations/acc-001'
        }
      ])
    })
  })
})
