import { config } from '#config/config.js'
import hapi from '@hapi/hapi'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import fixture from '../../../../../fixtures/waste-organisations/organisations.json' with { type: 'json' }

import { createWasteOrganisationsPlugin } from './waste-organisations.plugin.js'

vi.mock(import('./api-adapter.js'), () => ({
  createApiWasteOrganisationsService: vi.fn(() => ({
    getOrganisations: vi
      .fn()
      .mockResolvedValue({ organisations: [{ id: 'api-org' }] })
  }))
}))

describe('#createWasteOrganisationsPlugin', () => {
  let server

  beforeEach(async () => {
    server = hapi.server({ port: 0 })
  })

  afterEach(async () => {
    await server.stop()
    config.reset('wasteOrganisationsApi.useInMemory')
  })

  it('should use in-memory adapter when useInMemory is true', async () => {
    config.set('wasteOrganisationsApi.useInMemory', true)

    await server.register(
      createWasteOrganisationsPlugin({
        initialOrganisations: fixture.organisations
      })
    )
    server.route({
      method: 'GET',
      path: '/test',
      handler: async (request) => {
        const { organisations } =
          await request.wasteOrganisationsService.getOrganisations()
        return { count: organisations.length }
      },
      options: { auth: false }
    })
    await server.initialize()

    const response = await server.inject({ method: 'GET', url: '/test' })
    const result = JSON.parse(response.payload)

    expect(result.count).toBe(3)
  })

  it('should use API adapter when useInMemory is false', async () => {
    config.set('wasteOrganisationsApi.useInMemory', false)

    await server.register(createWasteOrganisationsPlugin())
    server.route({
      method: 'GET',
      path: '/test',
      handler: async (request) => {
        const { organisations } =
          await request.wasteOrganisationsService.getOrganisations()
        return { organisations }
      },
      options: { auth: false }
    })
    await server.initialize()

    const response = await server.inject({ method: 'GET', url: '/test' })
    const result = JSON.parse(response.payload)

    expect(result.organisations).toStrictEqual([{ id: 'api-org' }])
  })

  it('should use custom initial organisations for in-memory adapter', async () => {
    config.set('wasteOrganisationsApi.useInMemory', true)

    const customOrgs = [{ id: 'custom-1', name: 'Custom' }]
    await server.register(
      createWasteOrganisationsPlugin({ initialOrganisations: customOrgs })
    )
    server.route({
      method: 'GET',
      path: '/test',
      handler: async (request) => {
        const { organisations } =
          await request.wasteOrganisationsService.getOrganisations()
        return { organisations }
      },
      options: { auth: false }
    })
    await server.initialize()

    const response = await server.inject({ method: 'GET', url: '/test' })
    const result = JSON.parse(response.payload)

    expect(result.organisations).toStrictEqual(customOrgs)
  })
})
