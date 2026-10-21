import { fetchRequiredAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import {
  buildAccreditationView,
  buildRegistrationView,
  buildRegistrationWithAccreditation
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import {
  asCreatePrnResponse,
  asUpdatePrnStatusResponse
} from '#server/common/test-helpers/prn-fixtures.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-with-accreditation.js')
)
vi.mock(import('./helpers/fetch-prn-waste-balance.js'))
vi.mock(
  import('#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js')
)
vi.mock(import('./helpers/create-prn.js'))
vi.mock(import('./helpers/update-prn-status.js'))
vi.mock(import('./helpers/fetch-december-prn-eligibility.js'))

const { createPrn } = await import('./helpers/create-prn.js')
const { updatePrnStatus } = await import('./helpers/update-prn-status.js')
const { fetchPrnWasteBalance } =
  await import('./helpers/fetch-prn-waste-balance.js')
const { fetchDecemberPrnEligibility } =
  await import('./helpers/fetch-december-prn-eligibility.js')
const { fetchOrganisationWasteBalances } =
  await import('#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js')

/** @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js' */

/**
 * The accreditation's balance, as the create and confirm steps each read it.
 * @param {WasteBalance} balance
 */
const mockBalance = (balance) => {
  vi.mocked(fetchPrnWasteBalance).mockResolvedValue(balance)
  vi.mocked(fetchOrganisationWasteBalances).mockResolvedValue({
    'ACC-001': balance
  })
}

const mockCredentials = buildMockAuth().credentials

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const fixtureReprocessor = buildRegistrationWithAccreditation({
  organisation: { name: 'Reprocessor Organisation' },
  registration: buildRegistrationView({
    wasteProcessingType: 'reprocessor',
    reprocessingType: 'input',
    site: { address: { fullAddress: 'Reprocessing Site' } }
  }),
  accreditation: buildAccreditationView({ accreditationNumber: 'ACC-001' })
})

const fixtureExporter = buildRegistrationWithAccreditation({
  organisation: { name: 'Exporter Organisation' },
  accreditation: buildAccreditationView({ accreditationNumber: 'ACC-001' })
})

const organisationNumber = '500123'
const prnsBase = `/organisations/${organisationNumber}/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes`
const prnId = 'prn-789'
const pernId = 'pern-123'
const createUrl = `${prnsBase}/create`
const viewUrl = `${prnsBase}/${prnId}/view`
const createdUrl = `${prnsBase}/${prnId}/created`
const pernCreatedUrl = `${prnsBase}/${pernId}/created`

const validPayload = {
  tonnage: '100',
  recipient: 'producer-1',
  notes: 'Test notes',
  wasteProcessingType: 'reprocessor-input'
}

const mockPrnCreated = asCreatePrnResponse({
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'reprocessor-input'
})

const mockDecemberWastePrnCreated = asCreatePrnResponse({
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'reprocessor-input',
  isDecemberWaste: true
})

const mockPernCreated = asCreatePrnResponse({
  id: 'pern-123',
  tonnage: 50,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'exporter'
})

const mockPrnStatusUpdated = asUpdatePrnStatusResponse({
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation'
})

const mockPernStatusUpdated = asUpdatePrnStatusResponse({
  id: 'pern-123',
  tonnage: 50,
  material: 'plastic',
  status: 'awaiting_authorisation'
})

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
    vi.mocked(fetchRequiredAccreditation).mockResolvedValue(fixtureReprocessor)
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
    vi.mocked(updatePrnStatus).mockResolvedValue(mockPrnStatusUpdated)
    mockBalance({
      amount: 1000,
      availableAmount: 500
    })
    vi.mocked(fetchDecemberPrnEligibility).mockResolvedValue({
      mode: 'none',
      windowOpen: false
    })
  })

  describe('request handling', () => {
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

      it('displays "PRN created from December waste" heading when the flag is true', async ({
        server
      }) => {
        vi.mocked(createPrn).mockResolvedValue(mockDecemberWastePrnCreated)
        mockBalance({
          amount: 1000,
          availableAmount: 500,
          decemberAmount: 500,
          decemberAvailableAmount: 500
        })
        vi.mocked(fetchDecemberPrnEligibility).mockResolvedValue({
          mode: 'pool',
          windowOpen: true
        })

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

        expect(
          getByText(main, /PRN created from December waste/i)
        ).toBeDefined()
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
          `${prnsBase}/${prnId}/view`
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
        expect(prnsPageLink.getAttribute('href')).toBe(prnsBase)
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
          `${prnsBase}/create`
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
          `/organisations/${organisationNumber}`
        )
      })

      it('displays PERN text for exporter wasteProcessingType', async ({
        server
      }) => {
        // Set up exporter fixture for PERN
        vi.mocked(fetchRequiredAccreditation).mockResolvedValue(fixtureExporter)
        vi.mocked(createPrn).mockResolvedValue(mockPernCreated)
        vi.mocked(updatePrnStatus).mockResolvedValue(mockPernStatusUpdated)

        const exporterPayload = {
          ...validPayload,
          wasteProcessingType: 'exporter'
        }

        const pernViewUrl = `${prnsBase}/${pernId}/view`
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
        const differentCreatedUrl = `${prnsBase}/different-id/created`
        const differentViewUrl = `${prnsBase}/different-id/view`

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
})
