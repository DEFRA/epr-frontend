import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest'

import { config } from '#config/config.js'
import hapi from '@hapi/hapi'

import fixture from '../../../../../fixtures/waste-organisations/organisations.json' with { type: 'json' }

import { createWasteOrganisationsPlugin } from './waste-organisations.plugin.js'

describe('#createWasteOrganisationsPlugin', () => {
  let server

  beforeEach(async () => {
    server = hapi.server({ port: 0 })
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('inmemory', () => {
    beforeEach(() => {
      config.set('wasteOrganisationsApi.useInMemory', true)
    })

    afterEach(() => {
      config.reset('wasteOrganisationsApi.useInMemory')
    })

    it('should return fixture organisations', async () => {
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

      expect(result.count).toBe(8)
    })

    it('should return custom initial organisations', async () => {
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

  describe('api', () => {
    const apiUrl = 'http://waste-orgs-test.api'
    const mockApiOrganisations = [{ id: 'api-org' }]

    const msw = setupServer(
      http.get(apiUrl, () => HttpResponse.json(mockApiOrganisations))
    )

    beforeAll(() => {
      msw.listen({ onUnhandledRequest: 'error' })
    })

    beforeEach(() => {
      config.set('wasteOrganisationsApi.useInMemory', false)
      config.set('wasteOrganisationsApi.url', apiUrl)
      config.set('wasteOrganisationsApi.username', 'testuser')
      config.set('wasteOrganisationsApi.password', 'testpass')
      config.set('wasteOrganisationsApi.key', 'test-key')
      config.set('isDevelopment', true)
    })

    afterEach(() => {
      msw.resetHandlers()
      config.reset('wasteOrganisationsApi.useInMemory')
      config.reset('wasteOrganisationsApi.url')
      config.reset('wasteOrganisationsApi.username')
      config.reset('wasteOrganisationsApi.password')
      config.reset('wasteOrganisationsApi.key')
      config.reset('isDevelopment')
    })

    afterAll(() => {
      msw.close()
    })

    it('should return organisations from API', async () => {
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

      expect(result.organisations).toStrictEqual(mockApiOrganisations)
    })
  })
})
