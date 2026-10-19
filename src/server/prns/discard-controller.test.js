import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditationByNumber } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import {
  asCreatePrnResponse,
  asRegistrationWithLiveAccreditation,
  asUpdatePrnStatusResponse
} from '#server/common/test-helpers/prn-fixtures.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('./helpers/fetch-prn-waste-balance.js'))
vi.mock(import('./helpers/create-prn.js'))
vi.mock(import('./helpers/update-prn-status.js'))

const { fetchPrnWasteBalance } =
  await import('./helpers/fetch-prn-waste-balance.js')
const { createPrn } = await import('./helpers/create-prn.js')
const { updatePrnStatus } = await import('./helpers/update-prn-status.js')

const mockCredentials = buildMockAuth().credentials

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const fixtureReprocessor = asRegistrationWithLiveAccreditation({
  organisationData: { id: 'org-123', name: 'Reprocessor Organisation' },
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
    accreditationNumber: 'ACC-001',
    status: 'approved'
  }
})

const fixtureExporter = asRegistrationWithLiveAccreditation({
  organisationData: { id: 'org-123', name: 'Exporter Organisation' },
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
    accreditationNumber: 'ACC-001',
    status: 'approved'
  }
})

const keys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL',
  year: '2026'
}
const prnsBase =
  '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes'
const prnId = 'prn-789'
const pernId = 'pern-123'
const createUrl = `${prnsBase}/create`
const viewUrl = `${prnsBase}/${prnId}/view`
const discardUrl = `${prnsBase}/${prnId}/discard`
const pernDiscardUrl = `${prnsBase}/${pernId}/discard`

const validPayload = {
  tonnage: '100',
  recipient: 'producer-1',
  notes: 'Test notes',
  nation: 'england',
  wasteProcessingType: 'reprocessor-input'
}

const mockPrnCreated = asCreatePrnResponse({
  id: 'prn-789',
  tonnage: 100,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'reprocessor-input'
})

const mockPernCreated = asCreatePrnResponse({
  id: 'pern-123',
  tonnage: 50,
  material: 'plastic',
  status: 'draft',
  wasteProcessingType: 'exporter'
})

vi.spyOn(metrics.journey, 'start').mockResolvedValue()
vi.spyOn(metrics.journey, 'end').mockResolvedValue()

describe('#discardController', () => {
  beforeEach(({ msw }) => {
    vi.clearAllMocks()
    msw.use(
      http.get(
        `${config.get('eprBackendUrl')}/organisations/:organisationNumber/registrations/:registrationNumber/accreditations/:year/packaging-recycling-notes/december-prn-eligibility`,
        () => HttpResponse.json({ mode: 'pool', windowOpen: false })
      )
    )
    vi.mocked(
      getRequiredRegistrationWithAccreditationByNumber
    ).mockResolvedValue(fixtureReprocessor)
    vi.mocked(fetchPrnWasteBalance).mockResolvedValue(null)
    vi.mocked(createPrn).mockResolvedValue(mockPrnCreated)
    vi.mocked(updatePrnStatus).mockResolvedValue(
      asUpdatePrnStatusResponse({
        ...mockPrnCreated,
        status: 'discarded'
      })
    )
  })

  describe('request handling', () => {
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
        expect(button.getAttribute('data-prevent-double-click')).toBe('true')
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
        vi.mocked(
          getRequiredRegistrationWithAccreditationByNumber
        ).mockResolvedValue(fixtureExporter)
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
        const wrongPrnDiscardUrl = `${prnsBase}/wrong-prn-id/discard`

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
          keys,
          prnId,
          { status: 'discarded' },
          mockCredentials.backendToken
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
        expect(server.loggerMocks.error).toHaveBeenCalledWith({
          message: 'Failed to discard PRN',
          error: {
            code: 'prn_discard_failed',
            id: expect.any(String),
            message: 'Failed to discard PRN',
            stack_trace: expect.any(String),
            type: 'Internal Server Error'
          },
          event: {
            category: 'http',
            action: 'discard_prn',
            kind: 'event',
            outcome: 'failure',
            reason: 'type=Error code=unknown'
          },
          http: { response: { status_code: 500 } }
        })
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

  describe('journey events', () => {
    const startDraft = async (server) => {
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

      const cookies = mergeCookies(
        csrfCookie,
        ...extractCookieValues(postResponse.headers['set-cookie'])
      )

      return { cookies, crumb }
    }

    it('should record the journey start when the confirmation page renders', async ({
      server
    }) => {
      const { cookies } = await startDraft(server)

      await server.inject({
        method: 'GET',
        url: discardUrl,
        auth: mockAuth,
        headers: { cookie: cookies }
      })

      expect(metrics.journey.start).toHaveBeenCalledWith(
        expect.anything(),
        JOURNEY.discardPrn,
        prnId
      )
    })

    it('should record the journey end once the action succeeds', async ({
      server
    }) => {
      const { cookies, crumb } = await startDraft(server)

      await server.inject({
        method: 'POST',
        url: discardUrl,
        auth: mockAuth,
        headers: { cookie: cookies },
        payload: { crumb }
      })

      expect(metrics.journey.end).toHaveBeenCalledWith(
        expect.anything(),
        JOURNEY.discardPrn,
        prnId
      )
    })
  })
})
