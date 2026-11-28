import { config } from '#config/config.js'
import { toYear } from '#server/common/helpers/year.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { beforeEach, it as base } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, vi } from 'vitest'

import { createApiWasteOrganisationsService } from './api-adapter.js'
import { testWasteOrganisationsServiceContract } from './port.contract.js'

/**
 * @import { SetupServer } from 'msw/node'
 */

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
        registrationYear: 2026,
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
        registrationYear: 2026,
        status: 'REGISTERED'
      }
    ]
  }
]

const mockLogger = createMockLogger()

const apiUrl = 'http://waste-orgs-test.api'

const it = base.extend({
  // eslint-disable-next-line no-empty-pattern
  wasteOrganisationsService: async ({}, use) => {
    const service = createApiWasteOrganisationsService(mockLogger)
    await use(service)
  }
})

describe('#createApiWasteOrganisationsService', () => {
  beforeAll(() => {
    config.set('wasteOrganisationsApi.url', apiUrl)
    config.set('wasteOrganisationsApi.username', 'testuser')
    config.set('wasteOrganisationsApi.password', 'testpass')
    config.set('wasteOrganisationsApi.key', 'test-key')
    config.set('isDevelopment', true)
  })

  beforeEach(({ msw }) => {
    msw.use(
      http.get(apiUrl, () =>
        HttpResponse.json({ organisations: mockApiOrganisations })
      )
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
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
      const { organisations } = await service.getOrganisations([toYear(2026)])

      expect(organisations[0].registrationType).toBe('LARGE_PRODUCER')
      expect(organisations[1].registrationType).toBe('COMPLIANCE_SCHEME')
    })

    it('removes raw registrations array from returned organisations', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([toYear(2026)])

      expect(organisations[0]).not.toHaveProperty('registrations')
      expect(organisations[1]).not.toHaveProperty('registrations')
    })

    it('preserves other organisation fields', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([toYear(2026)])

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
    it('warns when an organisation has no registrations', async ({ msw }) => {
      msw.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              { id: 'org-no-regs', name: 'No Regs Ltd', address: {} }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: expect.stringContaining('no producer registration'),
        event: {
          action: 'extract_registration_types',
          reason:
            'organisationId=org-no-regs organisationName=No Regs Ltd registrationYears=2026'
        }
      })
    })

    it('warns when an organisation has empty registrations array', async ({
      msw
    }) => {
      msw.use(
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
      await service.getOrganisations([toYear(2026)])

      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    })

    it('warns when registrations exist but none are producer types', async ({
      msw
    }) => {
      msw.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-reprocessor',
                name: 'Reprocessor Only',
                address: {},
                registrations: [
                  {
                    type: 'REPROCESSOR',
                    registrationYear: 2026,
                    status: 'REGISTERED'
                  }
                ]
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    })

    it('warns when an organisation has both LARGE_PRODUCER and COMPLIANCE_SCHEME', async ({
      msw
    }) => {
      msw.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-dual',
                name: 'Dual Type',
                address: {},
                registrations: [
                  {
                    type: 'LARGE_PRODUCER',
                    registrationYear: 2026,
                    status: 'REGISTERED'
                  },
                  {
                    type: 'COMPLIANCE_SCHEME',
                    registrationYear: 2026,
                    status: 'REGISTERED'
                  }
                ]
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: expect.stringContaining(
          'both LARGE_PRODUCER and COMPLIANCE_SCHEME'
        ),
        event: {
          action: 'extract_registration_types',
          reason:
            'organisationId=org-dual organisationName=Dual Type registrationYear=2026'
        }
      })
    })

    it('does not warn when organisations have valid producer registrations', async () => {
      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })

  describe('registration year, in January of the following year', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2027-01-05T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('requests organisations registered for the given year, not the calendar year', async ({
      msw
    }) => {
      let requestedUrl = new URL(apiUrl)

      msw.use(
        http.get(apiUrl, ({ request }) => {
          requestedUrl = new URL(request.url)
          return HttpResponse.json({ organisations: mockApiOrganisations })
        })
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      expect(Object.fromEntries(requestedUrl.searchParams)).toStrictEqual({
        registrations: 'LARGE_PRODUCER,COMPLIANCE_SCHEME',
        registrationYears: '2026',
        statuses: 'REGISTERED'
      })
    })

    it('takes the registration type from the given year when another year has a different type', async ({
      msw
    }) => {
      msw.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-switched',
                name: 'Switched Ltd',
                address: {},
                registrations: [
                  {
                    type: 'LARGE_PRODUCER',
                    registrationYear: 2026,
                    status: 'REGISTERED'
                  },
                  {
                    type: 'COMPLIANCE_SCHEME',
                    registrationYear: 2027,
                    status: 'REGISTERED'
                  }
                ]
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([toYear(2026)])

      expect(organisations[0].registrationType).toBe('LARGE_PRODUCER')
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it('leaves out an organisation whose only producer registration is for another year', async ({
      msw
    }) => {
      msw.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-next-year',
                name: 'Next Year Ltd',
                address: {},
                registrations: [
                  {
                    type: 'LARGE_PRODUCER',
                    registrationYear: 2027,
                    status: 'REGISTERED'
                  }
                ]
              }
            ]
          })
        )
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([toYear(2026)])

      expect(organisations).toStrictEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: expect.stringContaining(
          'no producer registration for the registration years'
        ),
        event: {
          action: 'extract_registration_types',
          reason:
            'organisationId=org-next-year organisationName=Next Year Ltd registrationYears=2026'
        }
      })
    })
  })

  describe('several registration years, for December waste', () => {
    /**
     * @param {SetupServer} msw
     * @param {object[]} registrations
     */
    const respondWith = (msw, registrations) =>
      msw.use(
        http.get(apiUrl, () =>
          HttpResponse.json({
            organisations: [
              {
                id: 'org-1',
                name: 'Producer Ltd',
                address: {},
                registrations
              }
            ]
          })
        )
      )

    it('requests organisations registered for any of the given years', async ({
      msw
    }) => {
      let requestedUrl = new URL(apiUrl)

      msw.use(
        http.get(apiUrl, ({ request }) => {
          requestedUrl = new URL(request.url)
          return HttpResponse.json({ organisations: mockApiOrganisations })
        })
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026), toYear(2027)])

      expect(requestedUrl.searchParams.get('registrationYears')).toBe(
        '2026,2027'
      )
    })

    it('gives the years the organisation is registered for, in the order asked', async ({
      msw
    }) => {
      respondWith(msw, [
        {
          type: 'LARGE_PRODUCER',
          registrationYear: 2027,
          status: 'REGISTERED'
        },
        { type: 'LARGE_PRODUCER', registrationYear: 2026, status: 'REGISTERED' }
      ])

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([
        toYear(2026),
        toYear(2027)
      ])

      expect(organisations[0].registrationYears).toStrictEqual([2026, 2027])
    })

    it('gives only the following year when the organisation is registered for that year alone', async ({
      msw
    }) => {
      respondWith(msw, [
        {
          type: 'COMPLIANCE_SCHEME',
          registrationYear: 2027,
          status: 'REGISTERED'
        }
      ])

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([
        toYear(2026),
        toYear(2027)
      ])

      expect(organisations[0]).toMatchObject({
        registrationType: 'COMPLIANCE_SCHEME',
        registrationYears: [2027]
      })
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it('takes the registration type from the first given year when the years differ', async ({
      msw
    }) => {
      respondWith(msw, [
        {
          type: 'COMPLIANCE_SCHEME',
          registrationYear: 2027,
          status: 'REGISTERED'
        },
        { type: 'LARGE_PRODUCER', registrationYear: 2026, status: 'REGISTERED' }
      ])

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([
        toYear(2026),
        toYear(2027)
      ])

      expect(organisations[0].registrationType).toBe('LARGE_PRODUCER')
    })

    it('leaves out a year whose registration is cancelled', async ({ msw }) => {
      respondWith(msw, [
        { type: 'LARGE_PRODUCER', registrationYear: 2026, status: 'CANCELLED' },
        { type: 'LARGE_PRODUCER', registrationYear: 2027, status: 'REGISTERED' }
      ])

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([
        toYear(2026),
        toYear(2027)
      ])

      expect(organisations[0].registrationYears).toStrictEqual([2027])
    })

    it('leaves out an organisation registered for none of the given years, naming them in the warning', async ({
      msw
    }) => {
      respondWith(msw, [])

      const service = createApiWasteOrganisationsService(mockLogger)
      const { organisations } = await service.getOrganisations([
        toYear(2026),
        toYear(2027)
      ])

      expect(organisations).toStrictEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: expect.stringContaining('no producer registration'),
        event: {
          action: 'extract_registration_types',
          reason:
            'organisationId=org-1 organisationName=Producer Ltd registrationYears=2026,2027'
        }
      })
    })
  })

  describe('authentication', () => {
    it('should send correct authentication headers', async ({ msw }) => {
      let capturedHeaders = {}

      msw.use(
        http.get(apiUrl, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries())
          return HttpResponse.json({ organisations: mockApiOrganisations })
        })
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      const expectedAuth = Buffer.from('testuser:testpass').toString('base64')
      expect(capturedHeaders.authorization).toBe(`Basic ${expectedAuth}`)
      expect(capturedHeaders['x-api-key']).toBe('test-key')
    })

    it('should not send x-api-key header in production', async ({ msw }) => {
      config.set('isDevelopment', false)
      let capturedHeaders = {}

      msw.use(
        http.get(apiUrl, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries())
          return HttpResponse.json({ organisations: mockApiOrganisations })
        })
      )

      const service = createApiWasteOrganisationsService(mockLogger)
      await service.getOrganisations([toYear(2026)])

      expect(capturedHeaders['x-api-key']).toBeUndefined()

      config.set('isDevelopment', true)
    })
  })
})
