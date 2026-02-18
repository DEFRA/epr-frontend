import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  it as base,
  beforeAll,
  describe,
  expect,
  vi
} from 'vitest'

import { config } from '#config/config.js'

import { createApiWasteOrganisationsService } from './api-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

const currentYear = new Date().getFullYear()

const mockApiOrganisations = [
  {
    id: 'org-1',
    name: 'Large Producer Ltd',
    tradingName: 'LP Trading',
    address: {
      addressLine1: '1 Test Street',
      town: 'Testville',
      postcode: 'T1 1TT'
    },
    registrations: [
      {
        type: 'LARGE_PRODUCER',
        registrationYear: currentYear,
        status: 'REGISTERED'
      }
    ]
  },
  {
    id: 'org-2',
    name: 'Scheme Operator Ltd',
    tradingName: 'Green Scheme',
    address: {
      addressLine1: '2 Scheme Road',
      town: 'Schemeton',
      postcode: 'S2 2SS'
    },
    registrations: [
      {
        type: 'COMPLIANCE_SCHEME',
        registrationYear: currentYear,
        status: 'REGISTERED'
      }
    ]
  }
]

const mockLogger = { warn: vi.fn() }

const apiUrl = 'http://waste-orgs-test.api'

const server = setupServer(
  http.get(apiUrl, () => {
    return HttpResponse.json({ organisations: mockApiOrganisations })
  })
)

const it = base.extend({
  // eslint-disable-next-line no-empty-pattern
  wasteOrganisationsService: async ({}, use) => {
    const service = createApiWasteOrganisationsService(mockLogger)
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
    vi.clearAllMocks()
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

  describe('registrationType extraction', () => {
    it('extracts registrationType from registrations array', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations()

      expect(organisations[0].registrationType).toBe('LARGE_PRODUCER')
      expect(organisations[1].registrationType).toBe('COMPLIANCE_SCHEME')
    })

    it('removes raw registrations array from returned organisations', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations()

      expect(organisations[0]).not.toHaveProperty('registrations')
      expect(organisations[1]).not.toHaveProperty('registrations')
    })

    it('preserves other organisation fields', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations()

      expect(organisations[0]).toMatchObject({
        id: 'org-1',
        name: 'Large Producer Ltd',
        tradingName: 'LP Trading',
        address: {
          addressLine1: '1 Test Street',
          town: 'Testville',
          postcode: 'T1 1TT'
        }
      })
    })
  })

  describe('missing registrations warnings', () => {
    it('warns when an organisation has no registrations', async () => {
      server.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              { id: 'org-no-regs', name: 'No Regs Ltd', address: {} }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { organisationId: 'org-no-regs', organisationName: 'No Regs Ltd' },
        expect.stringContaining('no producer registration')
      )
    })

    it('warns when an organisation has empty registrations array', async () => {
      server.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-empty',
                name: 'Empty Regs',
                address: {},
                registrations: []
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations()

      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    })

    it('warns when registrations exist but none are producer types', async () => {
      server.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-reprocessor',
                name: 'Reprocessor Only',
                address: {},
                registrations: [
                  { type: 'REPROCESSOR', registrationYear: currentYear }
                ]
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations()

      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    })

    it('warns when an organisation has both LARGE_PRODUCER and COMPLIANCE_SCHEME', async () => {
      server.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-dual',
                name: 'Dual Type',
                address: {},
                registrations: [
                  { type: 'LARGE_PRODUCER', registrationYear: currentYear },
                  { type: 'COMPLIANCE_SCHEME', registrationYear: currentYear }
                ]
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { organisationId: 'org-dual', organisationName: 'Dual Type' },
        expect.stringContaining('both LARGE_PRODUCER and COMPLIANCE_SCHEME')
      )
    })

    it('does not warn when organisations have valid producer registrations', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations()

      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })

  describe('authentication', () => {
    it('should send correct authentication headers', async () => {
      let capturedHeaders = {}

      server.use(
        http.get(apiUrl, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries())
          return HttpResponse.json({ organisations: mockApiOrganisations })
        })
      )

      const service = createApiWasteOrganisationsService(mockLogger)
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
          return HttpResponse.json({ organisations: mockApiOrganisations })
        })
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations()

      expect(capturedHeaders['x-api-key']).toBeUndefined()

      config.set('isDevelopment', true)
    })
  })
})
