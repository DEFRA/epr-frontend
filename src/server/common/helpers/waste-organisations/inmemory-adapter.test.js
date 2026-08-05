import { it as base, describe, expect } from 'vitest'

import fixture from '../../../../../fixtures/waste-organisations/organisations.json' with { type: 'json' }

import { createInMemoryWasteOrganisationsService } from './inmemory-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

/**
 * @import { WasteOrganisation } from './types.js'
 * @import { WasteOrganisationsService } from './port.js'
 */

const it = base.extend({
  wasteOrganisationsService: async (
    // eslint-disable-next-line no-empty-pattern
    {},
    /** @type {(service: WasteOrganisationsService) => Promise<void>} */ use
  ) => {
    const service = createInMemoryWasteOrganisationsService(
      /** @type {WasteOrganisation[]} */ (fixture.organisations)
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
    const { organisations } = await wasteOrganisationsService.getOrganisations()

    expect(organisations).toHaveLength(8)
    expect(organisations[0].id).toBe('9eb099a7-bda0-456c-96ba-e0af3fdb9cde')
  })

  it('should default to empty array when no organisations provided', async () => {
    const service = createInMemoryWasteOrganisationsService()
    const { organisations } = await service.getOrganisations()

    expect(organisations).toHaveLength(0)
  })
})
