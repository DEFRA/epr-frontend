import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { fetchPackagingRecyclingNote } from '#server/common/helpers/packaging-recycling-notes/fetch-packaging-recycling-note.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-registration-with-accreditation.js')
)
vi.mock(
  import('#server/common/helpers/packaging-recycling-notes/fetch-packaging-recycling-note.js')
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
const prnId = 'prn-789'
const pernId = 'pern-123'
const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/create`
const checkUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prnId}/check`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prnId}/view`
const pernViewUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${pernId}/view`
const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes`

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

const mockPrnStatusUpdated = {
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation'
}

const mockPernStatusUpdated = {
  id: 'pern-123',
  tonnage: 50,
  material: 'plastic',
  status: 'awaiting_authorisation'
}

const mockPrnFromBackend = {
  id: 'prn-789',
  issuedToOrganisation: 'Acme Packaging Ltd',
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation',
  createdAt: '2026-01-15T10:00:00.000Z'
}

const mockPernFromBackend = {
  id: 'pern-123',
  issuedToOrganisation: 'Export Solutions Ltd',
  tonnage: 50,
  material: 'glass',
  status: 'issued',
  createdAt: '2026-01-20T14:30:00.000Z'
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

/**
 * Helper to go through full PRN creation flow and return session cookies
 * @param {object} server
 * @param {object} payload
 * @param {string} checkUrlOverride - Optional URL override for check page
 * @returns {Promise<{cookies: string}>}
 */
async function createPrnAndConfirm(
  server,
  payload = validPayload,
  checkUrlOverride = checkUrl
) {
  // Step 1: POST to create form to create draft and get redirected to check
  const { cookie: csrfCookie, crumb } = await getCsrfToken(server, createUrl, {
    auth: mockAuth
  })

  const postResponse = await server.inject({
    method: 'POST',
    url: createUrl,
    auth: mockAuth,
    headers: { cookie: csrfCookie },
    payload: { ...payload, crumb }
  })

  // Merge cookies from POST response
  const postCookieValues = extractCookieValues(
    postResponse.headers['set-cookie']
  )
  const cookies1 = mergeCookies(csrfCookie, ...postCookieValues)

  // Step 2: POST to check page to confirm and redirect to view
  const checkPostResponse = await server.inject({
    method: 'POST',
    url: checkUrlOverride,
    auth: mockAuth,
    headers: { cookie: cookies1 },
    payload: { crumb }
  })

  // Merge all cookies, with check response cookies taking precedence
  const checkCookieValues = extractCookieValues(
    checkPostResponse.headers['set-cookie']
  )
  const cookies = mergeCookies(cookies1, ...checkCookieValues)

  return { cookies }
}

/**
 * Helper for PERN creation flow (uses pernId-based URLs)
 * @param {object} server
 * @param {object} payload
 * @returns {Promise<{cookies: string}>}
 */
async function createPrnAndConfirmPern(server, payload) {
  const pernCheckUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${pernId}/check`
  return createPrnAndConfirm(server, payload, pernCheckUrl)
}

describe('#viewController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockPrnFromBackend)
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
    vi.mocked(updatePrnStatus).mockResolvedValue(mockPrnStatusUpdated)
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    describe('success page (after creating PRN)', () => {
      it('displays success page with PRN details', async ({ server }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
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
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
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
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
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
        vi.mocked(updatePrnStatus).mockResolvedValue(mockPernStatusUpdated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const { cookies } = await createPrnAndConfirmPern(
          server,
          exporterPayload
        )

        const { result } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PERN created/i)).toBeDefined()
      })
    })

    describe('view existing PRN (from list page)', () => {
      it('displays PRN details from backend', async ({ server }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Check PRN ID is displayed
        expect(getByText(main, /prn-789/i)).toBeDefined()
        // Check issued to
        expect(getByText(main, /Acme Packaging Ltd/i)).toBeDefined()
        // Check tonnage
        expect(getByText(main, /100 tonnes/i)).toBeDefined()
        // Check material
        expect(getByText(main, /Plastic/i)).toBeDefined()
      })

      it('displays status tag for awaiting authorisation', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Awaiting authorisation/i)).toBeDefined()
      })

      it('displays back link to list page', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink).toBeDefined()
        expect(backLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays return link to PRN list', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const returnLink = getByText(main, /Return to PRN list/i)
        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays PERN details for exporter registration', async ({
        server
      }) => {
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          mockPernFromBackend
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: pernViewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Check caption shows PERN
        const caption = main.querySelector('.govuk-caption-xl')
        expect(caption.textContent).toBe('PERN')

        // Check return link text
        expect(getByText(main, /Return to PERN list/i)).toBeDefined()
      })

      it('displays issued status with green tag', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'issued'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tag = main.querySelector('.govuk-tag--green')
        expect(tag).toBeDefined()
        expect(tag.textContent.trim()).toBe('Issued')
      })

      it('displays cancelled status with red tag', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'cancelled'
        })

        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const tag = main.querySelector('.govuk-tag--red')
        expect(tag).toBeDefined()
        expect(tag.textContent.trim()).toBe('Cancelled')
      })

      it('returns 404 when registration not found', async ({ server }) => {
        vi.mocked(getRegistrationWithAccreditation).mockResolvedValue({
          organisationData: fixtureReprocessor.organisationData,
          registration: null,
          accreditation: null
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('returns 404 when PRN not found', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(null)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('formats date correctly', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /15 January 2026/i)).toBeDefined()
      })

      it('handles unknown status gracefully', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          status: 'some_unknown_status'
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        // Unknown status should be displayed as-is
        expect(getByText(main, /some_unknown_status/i)).toBeDefined()
      })

      it('handles null material gracefully', async ({ server }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockPrnFromBackend,
          material: null
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
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
          url: viewUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
