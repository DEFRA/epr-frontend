import { it as base, describe, expect } from 'vitest'

import fixture from '../../../../../fixtures/waste-organisations/organisations.json' with { type: 'json' }

import { createInMemoryWasteOrganisationsService } from './inmemory-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

const it = base.extend({
  // eslint-disable-next-line no-empty-pattern
  wasteOrganisationsService: async ({}, use) => {
    const service = createInMemoryWasteOrganisationsService(
      fixture.organisations
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

    expect(organisations).toHaveLength(3)
    expect(organisations[0].id).toBe('9eb099a7-bda0-456c-96ba-e0af3fdb9cde')
  })

  it('should default to empty array when no organisations provided', async () => {
    const service = createInMemoryWasteOrganisationsService()
    const { organisations } = await service.getOrganisations()

    expect(organisations).toHaveLength(0)
  })
})
