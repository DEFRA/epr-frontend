import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  it as base,
  beforeAll,
  describe,
  expect
} from 'vitest'

import { config } from '#config/config.js'

import { createApiWasteOrganisationsService } from './api-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

const mockOrganisations = [
  {
    id: 'org-1',
    name: 'Test Organisation',
    address: {
      addressLine1: '1 Test Street',
      town: 'Testville',
      postcode: 'T1 1TT'
    }
  }
]

const apiUrl = 'http://waste-orgs-test.api'

const server = setupServer(
  http.get(apiUrl, () => {
    return HttpResponse.json(mockOrganisations)
  })
)

const it = base.extend({
  // eslint-disable-next-line no-empty-pattern
  wasteOrganisationsService: async ({}, use) => {
    const service = createApiWasteOrganisationsService()
    await use(service)
  }
})

describe('#createApiWasteOrganisationsService', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
    config.set('wasteOrganisationsApi.url', apiUrl)
    config.set('wasteOrganisationsApi.username', 'testuser')
    config.set('wasteOrganisationsApi.password', 'testpass')
    config.set('wasteOrganisationsApi.key', 'test-key')
    config.set('isDevelopment', true)
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
    config.reset('wasteOrganisationsApi.url')
    config.reset('wasteOrganisationsApi.username')
    config.reset('wasteOrganisationsApi.password')
    config.reset('wasteOrganisationsApi.key')
    config.reset('isDevelopment')
  })

  describe('waste organisations service contract', () => {
    // eslint-disable-next-line vitest/require-hook
    testWasteOrganisationsServiceContract(it)
  })

  describe('authentication', () => {
    it('should send correct authentication headers', async () => {
      let capturedHeaders = {}

      server.use(
        http.get(apiUrl, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries())
          return HttpResponse.json(mockOrganisations)
        })
      )

      const service = createApiWasteOrganisationsService()
      await service.getOrganisations()

      const expectedAuth = Buffer.from('testuser:testpass').toString('base64')
      expect(capturedHeaders.authorization).toBe(`Basic ${expectedAuth}`)
      expect(capturedHeaders['x-api-key']).toBe('test-key')
    })

    it('should not send x-api-key header in production', async () => {
      config.set('isDevelopment', false)
      let capturedHeaders = {}

      server.use(
        http.get(apiUrl, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries())
          return HttpResponse.json(mockOrganisations)
        })
      )

      const service = createApiWasteOrganisationsService()
      await service.getOrganisations()

      expect(capturedHeaders['x-api-key']).toBeUndefined()

      config.set('isDevelopment', true)
    })
  })
})
