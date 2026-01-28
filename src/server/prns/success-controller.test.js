import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-registration-with-accreditation.js')
)
vi.mock(import('./helpers/create-prn.js'))

const { createPrn } = await import('./helpers/create-prn.js')

const mockCredentials = {
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const fixtureReprocessor = {
  organisationData: { id: 'org-123', name: 'Reprocessor Organisation' },
  registration: {
    id: 'reg-456',
    wasteProcessingType: 'reprocessor-input',
    material: 'plastic',
    nation: 'england',
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const fixtureExporter = {
  organisationData: { id: 'org-123', name: 'Exporter Organisation' },
  registration: {
    id: 'reg-456',
    wasteProcessingType: 'exporter',
    material: 'plastic',
    nation: 'england',
    site: null,
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
}

const organisationId = 'org-123'
const registrationId = 'reg-456'
const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
const successUrl = `/organisations/${organisationId}/registrations/${registrationId}/create-prn/success`

const validPayload = {
  tonnage: '100',
  recipient: 'producer-1',
  notes: 'Test notes',
  material: 'plastic',
  nation: 'england',
  wasteProcessingType: 'reprocessor-input'
}

const mockPrnCreated = {
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'reprocessor-input'
}

const mockPernCreated = {
  id: 'pern-123',
  tonnage: 50,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'exporter'
}

describe('#successController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    describe('with PRN in session', () => {
      it('displays success page with PRN details', async ({ server }) => {
        // First, create a PRN via POST to populate session
        const { cookie, crumb } = await getCsrfToken(server, createUrl, {
          auth: mockAuth
        })

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        // Extract session cookie from POST response
        const sessionCookie = postResponse.headers['set-cookie']
        const cookies = [
          cookie,
          ...(Array.isArray(sessionCookie) ? sessionCookie : [sessionCookie])
        ]
          .filter(Boolean)
          .join('; ')

        // Now access the success page
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: successUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PRN created/i)).toBeDefined()
        expect(getByText(main, /100/)).toBeDefined()
        expect(getByText(main, /tonnes/i)).toBeDefined()
      })

      it('displays what happens next section', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, createUrl, {
          auth: mockAuth
        })

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        const sessionCookie = postResponse.headers['set-cookie']
        const cookies = [
          cookie,
          ...(Array.isArray(sessionCookie) ? sessionCookie : [sessionCookie])
        ]
          .filter(Boolean)
          .join('; ')

        const { result } = await server.inject({
          method: 'GET',
          url: successUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /What happens next/i)).toBeDefined()
      })

      it('displays return link to registration dashboard', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, createUrl, {
          auth: mockAuth
        })

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        const sessionCookie = postResponse.headers['set-cookie']
        const cookies = [
          cookie,
          ...(Array.isArray(sessionCookie) ? sessionCookie : [sessionCookie])
        ]
          .filter(Boolean)
          .join('; ')

        const { result } = await server.inject({
          method: 'GET',
          url: successUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const returnLink = getByText(main, /Return to registration dashboard/i)

        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}`
        )
      })

      it('displays PERN text for exporter wasteProcessingType', async ({
        server
      }) => {
        // Set up exporter fixture for PERN
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(createPrn).mockResolvedValue(mockPernCreated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const { cookie, crumb } = await getCsrfToken(server, createUrl, {
          auth: mockAuth
        })

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...exporterPayload, crumb }
        })

        const sessionCookie = postResponse.headers['set-cookie']
        const cookies = [
          cookie,
          ...(Array.isArray(sessionCookie) ? sessionCookie : [sessionCookie])
        ]
          .filter(Boolean)
          .join('; ')

        const { result } = await server.inject({
          method: 'GET',
          url: successUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PERN created/i)).toBeDefined()
      })
    })

    describe('without PRN in session', () => {
      it('redirects to create PRN page', async ({ server }) => {
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: successUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
        )
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    it('returns 404', async ({ server }) => {
      // Disable feature flag before request
      config.set('featureFlags.prns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: successUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
