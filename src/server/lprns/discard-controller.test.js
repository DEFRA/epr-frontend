import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/create-prn.js'))
vi.mock(import('./helpers/update-prn-status.js'))

const { createPrn } = await import('./helpers/create-prn.js')
const { updatePrnStatus } = await import('./helpers/update-prn-status.js')

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
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const pernId = 'pern-123'
const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
const discardUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/discard`
const pernDiscardUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/discard`

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

/**
 * Extract cookie key=value pairs from Set-Cookie header(s)
 * @param {string | string[] | undefined} setCookieHeader
 * @returns {string[]}
 */
function extractCookieValues(setCookieHeader) {
  if (!setCookieHeader) return []
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader]
  return headers.filter(Boolean).map((header) => header.split(';')[0])
}

/**
 * Merge cookie strings, with later values overriding earlier ones
 * @param {...string} cookieStrings
 * @returns {string}
 */
function mergeCookies(...cookieStrings) {
  const cookies = {}
  for (const str of cookieStrings) {
    if (!str) continue
    for (const part of str.split(';')) {
      const [key, ...valueParts] = part.trim().split('=')
      if (key && valueParts.length > 0) {
        cookies[key] = valueParts.join('=')
      }
    }
  }
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

describe('#discardController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
    vi.mocked(updatePrnStatus).mockResolvedValue({
      ...mockPrnCreated,
      status: 'discarded'
    })
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    describe('GET /discard (confirmation page)', () => {
      it('displays confirmation heading for PRN', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /Are you sure you want to discard this PRN/i)
        ).toBeDefined()
      })

      it('displays warning text about discarding', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /This will discard the PRN you are creating/i)
        ).toBeDefined()
      })

      it('displays confirm discard button', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const button = getByRole(main, 'button', {
          name: /Discard and start again/i
        })
        expect(button).toBeDefined()
        expect(button.classList.contains('govuk-button--warning')).toBe(true)
      })

      it('displays back link to check page', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink).toBeDefined()
        expect(backLink.getAttribute('href')).toBe(viewUrl)
      })

      it('displays PERN wording for exporter registration', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(createPrn).mockResolvedValue(mockPernCreated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...exporterPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernDiscardUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /Are you sure you want to discard this PERN/i)
        ).toBeDefined()
      })

      it('redirects to create when no draft in session', async ({ server }) => {
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createUrl)
      })

      it('redirects to create when draft ID does not match URL', async ({
        server
      }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        // Visit discard URL with a different PRN ID
        const wrongPrnDiscardUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/wrong-prn-id/discard`

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: wrongPrnDiscardUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createUrl)
      })
    })

    describe('POST /discard (confirm discard)', () => {
      it('cancels draft PRN and redirects to create page', async ({
        server
      }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createUrl)
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'discarded' },
          mockCredentials.idToken
        )
      })

      it('clears draft from session after discard', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const discardResponse = await server.inject({
          method: 'POST',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        const discardCookieValues = extractCookieValues(
          discardResponse.headers['set-cookie']
        )
        const afterDiscardCookies = mergeCookies(
          cookies,
          ...discardCookieValues
        )

        // After discarding, the discard GET should redirect to create (no draft)
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: afterDiscardCookies }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createUrl)
      })

      it('redirects to create when no draft in session', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(createUrl)
        expect(updatePrnStatus).not.toHaveBeenCalled()
      })

      it('returns 500 when updatePrnStatus fails with non-Boom error', async ({
        server
      }) => {
        vi.mocked(updatePrnStatus).mockRejectedValueOnce(
          new Error('Backend error')
        )

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { statusCode } = await server.inject({
          method: 'POST',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })

      it('re-throws Boom errors from updatePrnStatus', async ({ server }) => {
        const Boom = await import('@hapi/boom')
        vi.mocked(updatePrnStatus).mockRejectedValueOnce(
          Boom.default.forbidden('Not authorised')
        )

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const postResponse = await server.inject({
          method: 'POST',
          url: createUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { ...validPayload, crumb }
        })

        const postCookieValues = extractCookieValues(
          postResponse.headers['set-cookie']
        )
        const cookies = mergeCookies(csrfCookie, ...postCookieValues)

        const { statusCode } = await server.inject({
          method: 'POST',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: cookies },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.forbidden)
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    it('returns 404 for GET', async ({ server }) => {
      config.set('featureFlags.lprns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: discardUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })

    it('returns 404 for POST', async ({ server }) => {
      config.set('featureFlags.lprns', false)

      try {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          createUrl,
          { auth: mockAuth }
        )

        const { statusCode } = await server.inject({
          method: 'POST',
          url: discardUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })
  })
})
