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
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))
vi.mock(import('./helpers/create-prn.js'))
vi.mock(import('./helpers/update-prn-status.js'))

const { createPrn } = await import('./helpers/create-prn.js')
const { updatePrnStatus } = await import('./helpers/update-prn-status.js')
const { fetchWasteBalances } =
  await import('#server/common/helpers/waste-balance/fetch-waste-balances.js')

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
  organisationData: {
    id: 'org-123',
    companyDetails: { name: 'Reprocessor Organisation' }
  },
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
  organisationData: {
    id: 'org-123',
    companyDetails: { name: 'Exporter Organisation' }
  },
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
const createdUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/created`
const pernCreatedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/created`

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
  prnNumber: 'PRN-2026-00001',
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation'
}

const mockPernStatusUpdated = {
  id: 'pern-123',
  prnNumber: 'PERN-2026-00001',
  tonnage: 50,
  material: 'plastic',
  status: 'awaiting_authorisation'
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
 * @param {string} viewUrlOverride - Optional URL override for view page
 * @returns {Promise<{cookies: string}>}
 */
async function createPrnAndConfirm(
  server,
  payload = validPayload,
  viewUrlOverride = viewUrl
) {
  // Step 1: POST to create form to create draft and get redirected to view
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

  // Step 2: POST to view page to confirm and redirect to created
  const viewPostResponse = await server.inject({
    method: 'POST',
    url: viewUrlOverride,
    auth: mockAuth,
    headers: { cookie: cookies1 },
    payload: { crumb }
  })

  // Merge all cookies, with view response cookies taking precedence
  const viewCookieValues = extractCookieValues(
    viewPostResponse.headers['set-cookie']
  )
  const cookies = mergeCookies(cookies1, ...viewCookieValues)

  return { cookies }
}

describe('#createdController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
    vi.mocked(updatePrnStatus).mockResolvedValue(mockPrnStatusUpdated)
    vi.mocked(fetchWasteBalances).mockResolvedValue({
      'acc-001': { amount: 1000, availableAmount: 500 }
    })
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    describe('success page (after creating PRN)', () => {
      it('displays success page with PRN created heading', async ({
        server
      }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PRN created/i)).toBeDefined()
      })

      it('displays status awaiting authorisation in panel', async ({
        server
      }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel.textContent).toContain('Status:')
        expect(panel.textContent).toContain('Awaiting authorisation')
      })

      it('displays PRN number in panel', async ({ server }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel.textContent).toContain('PRN number:')
        expect(panel.textContent).toContain('PRN-2026-00001')
      })

      it('displays View PRN button that opens in new tab', async ({
        server
      }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const viewButton = getByText(main, /View PRN \(opens in a new tab\)/i)

        expect(viewButton).toBeDefined()
        expect(viewButton.getAttribute('target')).toBe('_blank')
        expect(viewButton.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
        )
      })

      it('displays what happens next section with waste balance message', async ({
        server
      }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /What happens next/i)).toBeDefined()
        expect(
          getByText(main, /Your available waste balance has been updated/i)
        ).toBeDefined()
      })

      it('displays PRNs page link within issue text', async ({ server }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const prnsPageLink = getByText(main, /PRNs page/i)

        expect(prnsPageLink).toBeDefined()
        expect(prnsPageLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
        )
      })

      it('displays Create another PRN link', async ({ server }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const createAnotherLink = getByText(main, /Create another PRN/i)

        expect(createAnotherLink).toBeDefined()
        expect(createAnotherLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
        )
      })

      it('displays return to home link', async ({ server }) => {
        const { cookies } = await createPrnAndConfirm(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const returnLink = getByText(main, /Return to home/i)

        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}`
        )
      })

      it('displays PERN text for exporter wasteProcessingType', async ({
        server
      }) => {
        // Set up exporter fixture for PERN
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(createPrn).mockResolvedValue(mockPernCreated)
        vi.mocked(updatePrnStatus).mockResolvedValue(mockPernStatusUpdated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const pernViewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/view`
        const { cookies } = await createPrnAndConfirm(
          server,
          exporterPayload,
          pernViewUrl
        )

        const { result } = await server.inject({
          method: 'GET',
          url: pernCreatedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PERN created/i)).toBeDefined()
        expect(
          getByText(main, /View PERN \(opens in a new tab\)/i)
        ).toBeDefined()
        expect(getByText(main, /PERNs page/i)).toBeDefined()
        expect(getByText(main, /Create another PERN/i)).toBeDefined()
      })

      it('displays PERN number in panel for exporter', async ({ server }) => {
        // Set up exporter fixture for PERN
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(createPrn).mockResolvedValue(mockPernCreated)
        vi.mocked(updatePrnStatus).mockResolvedValue(mockPernStatusUpdated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const pernViewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/view`
        const { cookies } = await createPrnAndConfirm(
          server,
          exporterPayload,
          pernViewUrl
        )

        const { result } = await server.inject({
          method: 'GET',
          url: pernCreatedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel.textContent).toContain('PERN number:')
        expect(panel.textContent).toContain('PERN-2026-00001')
      })

      it('redirects to view when no session data', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, createUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(viewUrl)
      })

      it('redirects to view when session ID mismatch', async ({ server }) => {
        const { cookies } = await createPrnAndConfirm(server)

        // Try to access created page with different prnId
        const differentCreatedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/different-id/created`
        const differentViewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/different-id/view`

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: differentCreatedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(differentViewUrl)
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

    it('returns 404', async ({ server }) => {
      config.set('featureFlags.lprns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })
  })
})
