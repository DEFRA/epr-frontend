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
  accreditation: {
    id: 'acc-001',
    status: 'approved',
    accreditationNumber: 'ACC-2025-001'
  }
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
  accreditation: {
    id: 'acc-001',
    status: 'approved',
    accreditationNumber: 'ACC-2025-002'
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-456'
const prnId = 'prn-789'
const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/create`
const checkUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prnId}/check`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prnId}/view`

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
  tonnageInWords: 'One hundred',
  material: 'plastic',
  status: 'draft',
  processToBeUsed: 'R3',
  isDecemberWaste: false
}

const mockPrnStatusUpdated = {
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation'
}

/**
 * Helper to create PRN draft and return session cookies
 */
async function createPrnDraft(server, payload = validPayload) {
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

  const postCookies = postResponse.headers['set-cookie']
  const cookies = [
    csrfCookie,
    ...(Array.isArray(postCookies) ? postCookies : [postCookies])
  ]
    .filter(Boolean)
    .join('; ')

  return { cookies, crumb }
}

describe('#checkController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
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

    describe('gET /check', () => {
      describe('with draft PRN in session', () => {
        it('displays check page with caption and heading', async ({
          server
        }) => {
          const { cookies } = await createPrnDraft(server)

          const { result, statusCode } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          expect(statusCode).toBe(statusCodes.ok)

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          // Check caption exists
          const caption = main.querySelector('.govuk-caption-xl')
          expect(caption.textContent).toBe('Create PRN')

          // Check heading
          expect(
            getByRole(main, 'heading', { name: /Check before creating PRN/i })
          ).toBeDefined()
        })

        it('displays intro text and inset text', async ({ server }) => {
          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(
            getByText(
              main,
              /Check the following information is correct before creating this PRN/i
            )
          ).toBeDefined()
          expect(
            getByText(
              main,
              /When created, the PRN will need to be authorised and issued/i
            )
          ).toBeDefined()
          expect(
            getByText(
              main,
              /Any information that is not shown here will be automatically populated/i
            )
          ).toBeDefined()
        })

        it('displays PRN details and accreditation sections', async ({
          server
        }) => {
          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /PRN details/i)).toBeDefined()
          expect(getByText(main, /Accreditation details/i)).toBeDefined()
        })

        it('displays summary list with PRN details keys', async ({
          server
        }) => {
          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          // PRN details section - check summary list keys
          const summaryListKeys = main.querySelectorAll(
            '.govuk-summary-list__key'
          )
          const keyTexts = Array.from(summaryListKeys).map((k) =>
            k.textContent.trim()
          )

          expect(keyTexts).toStrictEqual(
            expect.arrayContaining([
              'Issued by',
              'Packaging waste producer or compliance scheme',
              'Tonnage',
              'Tonnage in words',
              'Process to be used',
              'December waste',
              'Issue comments',
              'Issued date',
              'Authorised by',
              'Position',
              'Material'
            ])
          )
        })

        it('displays summary list with correct values', async ({ server }) => {
          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /Reprocessor Organisation/i)).toBeDefined()
          expect(getByText(main, /Acme Packaging Ltd/i)).toBeDefined()
          expect(getByText(main, /Plastic/i)).toBeDefined()
          expect(getByText(main, /ACC-2025-001/)).toBeDefined()
        })

        it('displays Issued by value from organisationData.companyDetails.name', async ({
          server
        }) => {
          vi.mocked(getRegistrationWithAccreditation).mockResolvedValue({
            ...fixtureReprocessor,
            organisationData: {
              ...fixtureReprocessor.organisationData,
              companyDetails: { name: 'Custom Waste Services Ltd' }
            }
          })

          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const summaryRows = body.querySelectorAll('.govuk-summary-list__row')

          // Find the "Issued by" row and check its value
          const issuedByRow = Array.from(summaryRows).find((row) =>
            row
              .querySelector('.govuk-summary-list__key')
              ?.textContent.includes('Issued by')
          )
          const issuedByValue = issuedByRow
            ?.querySelector('.govuk-summary-list__value')
            ?.textContent.trim()

          expect(issuedByValue).toBe('Custom Waste Services Ltd')
        })

        it('displays "n/a" when companyDetails.name is not available', async ({
          server
        }) => {
          vi.mocked(getRegistrationWithAccreditation).mockResolvedValue({
            ...fixtureReprocessor,
            organisationData: {
              id: 'org-123',
              companyDetails: null
            }
          })

          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const summaryRows = body.querySelectorAll('.govuk-summary-list__row')

          const issuedByRow = Array.from(summaryRows).find((row) =>
            row
              .querySelector('.govuk-summary-list__key')
              ?.textContent.includes('Issued by')
          )
          const issuedByValue = issuedByRow
            ?.querySelector('.govuk-summary-list__value')
            ?.textContent.trim()

          expect(issuedByValue).toBe('n/a')
        })

        it('displays notes when provided', async ({ server }) => {
          const { cookies } = await createPrnDraft(server, {
            ...validPayload,
            notes: 'My test notes'
          })

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /My test notes/i)).toBeDefined()
        })

        it('displays "Yes" for December waste when isDecemberWaste is true', async ({
          server
        }) => {
          vi.mocked(createPrn).mockResolvedValue({
            ...mockPrnCreated,
            isDecemberWaste: true
          })

          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /^Yes$/)).toBeDefined()
        })

        it('displays empty values when optional fields are not provided', async ({
          server
        }) => {
          vi.mocked(createPrn).mockResolvedValue({
            ...mockPrnCreated,
            tonnageInWords: null,
            processToBeUsed: null
          })
          vi.mocked(getRegistrationWithAccreditation).mockResolvedValue({
            ...fixtureReprocessor,
            accreditation: {
              ...fixtureReprocessor.accreditation,
              accreditationNumber: null
            }
          })

          const { cookies } = await createPrnDraft(server)

          const { result, statusCode } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          expect(statusCode).toBe(statusCodes.ok)

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          // Verify the page renders without errors
          expect(getByText(main, /Tonnage in words/i)).toBeDefined()
          expect(getByText(main, /Process to be used/i)).toBeDefined()
        })

        it('displays "Not provided" when notes are empty', async ({
          server
        }) => {
          const { cookies } = await createPrnDraft(server, {
            ...validPayload,
            notes: ''
          })

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(getByText(main, /Issue comments/i)).toBeDefined()
          expect(getByText(main, /Not provided/i)).toBeDefined()
        })

        it('displays create button and cancel button', async ({ server }) => {
          const { cookies } = await createPrnDraft(server)

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          expect(
            getByRole(main, 'button', { name: /Create PRN/i })
          ).toBeDefined()
          expect(
            getByRole(main, 'button', { name: /Cancel without saving/i })
          ).toBeDefined()
        })

        it('displays PERN text for exporter', async ({ server }) => {
          vi.mocked(getRegistrationWithAccreditation).mockResolvedValue(
            fixtureExporter
          )

          const { cookies } = await createPrnDraft(server, {
            ...validPayload,
            wasteProcessingType: 'exporter'
          })

          const { result } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document
          const main = getByRole(body, 'main')

          // Check caption
          const caption = main.querySelector('.govuk-caption-xl')
          expect(caption.textContent).toBe('Create PERN')

          // Check heading and sections
          expect(
            getByRole(main, 'heading', { name: /Check before creating PERN/i })
          ).toBeDefined()
          expect(getByText(main, /PERN details/i)).toBeDefined()
          expect(
            getByRole(main, 'button', { name: /Create PERN/i })
          ).toBeDefined()
          expect(
            getByRole(main, 'button', { name: /Cancel without saving/i })
          ).toBeDefined()
        })
      })

      describe('without draft PRN in session', () => {
        it('redirects to create page', async ({ server }) => {
          const { statusCode, headers } = await server.inject({
            method: 'GET',
            url: checkUrl,
            auth: mockAuth
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(createUrl)
        })
      })
    })

    describe('pOST /check', () => {
      describe('with draft PRN in session', () => {
        it('redirects to success page', async ({ server }) => {
          const { cookies, crumb } = await createPrnDraft(server)

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies },
            payload: { crumb }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(viewUrl)
        })

        it('calls updatePrnStatus with correct parameters', async ({
          server
        }) => {
          const { cookies, crumb } = await createPrnDraft(server)

          await server.inject({
            method: 'POST',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies },
            payload: { crumb }
          })

          expect(updatePrnStatus).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            mockPrnCreated.id,
            { status: 'awaiting_authorisation' },
            mockCredentials.idToken
          )
        })

        it('returns 500 when updatePrnStatus fails', async ({ server }) => {
          vi.mocked(updatePrnStatus).mockRejectedValue(new Error('API error'))

          const { cookies, crumb } = await createPrnDraft(server)

          const { statusCode } = await server.inject({
            method: 'POST',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies },
            payload: { crumb }
          })

          expect(statusCode).toBe(statusCodes.internalServerError)
        })

        it('re-throws Boom errors from updatePrnStatus', async ({ server }) => {
          const { default: Boom } = await import('@hapi/boom')
          vi.mocked(updatePrnStatus).mockRejectedValue(
            Boom.notFound('PRN not found')
          )

          const { cookies, crumb } = await createPrnDraft(server)

          const { statusCode } = await server.inject({
            method: 'POST',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie: cookies },
            payload: { crumb }
          })

          expect(statusCode).toBe(statusCodes.notFound)
        })
      })

      describe('without draft PRN in session', () => {
        it('redirects to create page', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, createUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: checkUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(createUrl)
        })
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

    it('returns 404 for GET', async ({ server }) => {
      config.set('featureFlags.prns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: checkUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })

    it('returns 404 for POST', async ({ server }) => {
      const { cookie, crumb } = await getCsrfToken(server, createUrl, {
        auth: mockAuth
      })

      config.set('featureFlags.prns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'POST',
          url: checkUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
