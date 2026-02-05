import { it as base, describe, expect } from 'vitest'

import { createInMemoryWasteOrganisationsService } from './inmemory-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

const it = base.extend({
  // eslint-disable-next-line no-empty-pattern
  wasteOrganisationsService: async ({}, use) => {
    const service = createInMemoryWasteOrganisationsService()
    await use(service)
  }
})

describe('#createInMemoryWasteOrganisationsService', () => {
  describe('waste organisations service contract', () => {
    // eslint-disable-next-line vitest/require-hook
    testWasteOrganisationsServiceContract(it)
  })

  it('should return default organisations from fixture', async ({
    wasteOrganisationsService
  }) => {
    const { organisations } = await wasteOrganisationsService.getOrganisations()

    expect(organisations).toHaveLength(3)
    expect(organisations[0].id).toBe('9eb099a7-bda0-456c-96ba-e0af3fdb9cde')
  })

  it('should return custom initial organisations when provided', async () => {
    const customOrgs = [{ id: 'custom-1', name: 'Custom Org' }]

    const service = createInMemoryWasteOrganisationsService(customOrgs)
    const { organisations } = await service.getOrganisations()

    expect(organisations).toHaveLength(1)
    expect(organisations[0].id).toBe('custom-1')
  })
})
