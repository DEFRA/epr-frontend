// eslint-disable-next-line n/no-unpublished-import
import { beforeEach, describe, expect } from 'vitest'

export const testGetOrganisationsBehaviour = (it) => {
  describe('getOrganisations', () => {
    let service

    beforeEach(async ({ wasteOrganisationsService }) => {
      service = wasteOrganisationsService
    })

    it('should return organisations array', async () => {
      const result = await service.getOrganisations()

      expect(result).toHaveProperty('organisations')
      expect(Array.isArray(result.organisations)).toBe(true)
    })

    it('should return organisations with required fields', async () => {
      const { organisations } = await service.getOrganisations()

      expect(organisations.length).toBeGreaterThan(0)
      expect(organisations[0]).toHaveProperty('id')
      expect(organisations[0]).toHaveProperty('name')
    })

    it('should return cloned data to prevent mutation', async () => {
      const { organisations: first } = await service.getOrganisations()
      const { organisations: second } = await service.getOrganisations()

      expect(first).not.toBe(second)
      expect(first).toStrictEqual(second)
    })
  })
}
