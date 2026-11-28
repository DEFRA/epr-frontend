import { it as base, describe, expect } from 'vitest'

import fixture from '#fixtures/waste-organisations/organisations.json' with { type: 'json' }

import { toYear } from '#server/common/helpers/year.js'

import { createInMemoryWasteOrganisationsService } from './inmemory-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

/**
 * @import { InMemoryWasteOrganisation } from './inmemory-adapter.js'
 * @import { WasteOrganisationsService } from './port.js'
 */

/**
 * @param {Partial<InMemoryWasteOrganisation>} overrides
 * @returns {InMemoryWasteOrganisation}
 */
const buildOrganisation = (overrides) => ({
  id: 'org',
  name: 'Producer Ltd',
  tradingName: null,
  businessCountry: null,
  companiesHouseNumber: null,
  address: {
    addressLine1: null,
    addressLine2: null,
    town: null,
    county: null,
    postcode: null,
    country: null
  },
  ...overrides
})

const it = base.extend({
  wasteOrganisationsService: async (
    // eslint-disable-next-line no-empty-pattern
    {},
    /** @type {(service: WasteOrganisationsService) => Promise<void>} */ use
  ) => {
    const service = createInMemoryWasteOrganisationsService(
      /** @type {InMemoryWasteOrganisation[]} */ (fixture.organisations)
    )
    await use(service)
  }
})

describe('#createInMemoryWasteOrganisationsService', () => {
  describe('waste organisations service contract', () => {
    // eslint-disable-next-line vitest/require-hook
    testWasteOrganisationsServiceContract(it)
  })

  it('should return organisations provided at construction', async ({
    wasteOrganisationsService
  }) => {
    const { organisations } = await wasteOrganisationsService.getOrganisations([
      toYear(2026)
    ])

    expect(organisations).toHaveLength(8)
    expect(organisations[0].id).toBe('9eb099a7-bda0-456c-96ba-e0af3fdb9cde')
  })

  it('should default to empty array when no organisations provided', async () => {
    const service = createInMemoryWasteOrganisationsService()
    const { organisations } = await service.getOrganisations([toYear(2026)])

    expect(organisations).toHaveLength(0)
  })

  it('counts an organisation without stated years as registered for every requested year', async () => {
    const service = createInMemoryWasteOrganisationsService([
      buildOrganisation({ id: 'any-year' })
    ])

    const { organisations } = await service.getOrganisations([
      toYear(2026),
      toYear(2027)
    ])

    expect(organisations[0].registrationYears).toStrictEqual([2026, 2027])
  })

  it('returns only the requested years an organisation states', async () => {
    const service = createInMemoryWasteOrganisationsService([
      buildOrganisation({
        id: 'next-year',
        registrationYears: [toYear(2027)]
      })
    ])

    const { organisations } = await service.getOrganisations([
      toYear(2026),
      toYear(2027)
    ])

    expect(organisations[0].registrationYears).toStrictEqual([2027])
  })

  it('leaves out an organisation registered for none of the requested years', async () => {
    const service = createInMemoryWasteOrganisationsService([
      buildOrganisation({
        id: 'next-year',
        registrationYears: [toYear(2027)]
      })
    ])

    const { organisations } = await service.getOrganisations([toYear(2026)])

    expect(organisations).toStrictEqual([])
  })
})
