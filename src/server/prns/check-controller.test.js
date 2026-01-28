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
const checkUrl = `/organisations/${organisationId}/registrations/${registrationId}/create-prn/check`
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
  status: 'draft'
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
        it('displays check your answers page', async ({ server }) => {
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

          expect(
            getByText(main, /Check your answers before creating this PRN/i)
          ).toBeDefined()
        })

        it('displays summary list with PRN details', async ({ server }) => {
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

          expect(getByText(main, /Material/i)).toBeDefined()
          expect(getByText(main, /Plastic/i)).toBeDefined()
          expect(getByText(main, /100 tonnes/i)).toBeDefined()
          expect(getByText(main, /Acme Packaging Ltd/i)).toBeDefined()
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

        it('does not display notes row when notes are empty', async ({
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

          // Notes label should not be present
          const summaryList = main.querySelector('.govuk-summary-list')
          expect(summaryList.textContent).not.toContain('Add issuer notes')
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

          expect(
            getByText(main, /Check your answers before creating this PERN/i)
          ).toBeDefined()
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
          expect(headers.location).toBe(successUrl)
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
