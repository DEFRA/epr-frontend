import Boom from '@hapi/boom'
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

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const url = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create`

const validPayload = {
  tonnage: '100',
  recipient: 'producer-1',
  notes: 'Test notes',
  material: 'plastic',
  nation: 'england',
  wasteProcessingType: 'reprocessor-input'
}

describe('#postCreatePrnController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    describe('csrf protection', () => {
      it('should reject POST request without CSRF token', async ({
        server
      }) => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          payload: validPayload
        })

        expect(statusCode).toBe(statusCodes.forbidden)
      })
    })

    describe('with valid payload', () => {
      it('creates PRN draft and redirects to check page', async ({
        server
      }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft'
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/prn-789/view`
        )
      })

      it('calls createPrn with correct parameters', async ({ server }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft'
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(createPrn).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          {
            issuedToOrganisation: 'producer-1',
            tonnage: 100,
            material: 'plastic',
            nation: 'england',
            wasteProcessingType: 'reprocessor-input',
            issuerNotes: 'Test notes'
          },
          'mock-id-token'
        )
      })

      it('omits issuerNotes when notes is empty', async ({ server }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft'
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, notes: '', crumb }
        })

        expect(createPrn).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          expect.objectContaining({
            issuerNotes: undefined
          }),
          'mock-id-token'
        )
      })

      it('uses recipient value as name when not in stub list', async ({
        server
      }) => {
        vi.mocked(createPrn).mockResolvedValue({
          id: 'prn-789',
          tonnage: 100,
          material: 'plastic',
          status: 'draft'
        })

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const unknownRecipient = 'unknown-recipient-id'

        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, recipient: unknownRecipient, crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(createPrn).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          expect.objectContaining({
            issuedToOrganisation: unknownRecipient
          }),
          'mock-id-token'
        )
      })
    })

    describe('with invalid payload', () => {
      it('returns validation error when tonnage is missing', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /There is a problem/i)).toBeDefined()
      })

      it('returns validation error when recipient is missing', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, recipient: '', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /There is a problem/i)).toBeDefined()
      })

      it('returns validation error when tonnage is not a number', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: 'abc', crumb }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /There is a problem/i)).toBeDefined()

        const errorSummary = main.querySelector('.govuk-error-summary')

        expect(getByText(errorSummary, /Enter a whole number/i)).toBeDefined()
      })

      it('preserves form values on validation error', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const notesField = getByRole(main, 'textbox', { name: /notes/i })

        expect(notesField.value).toBe('Test notes')
      })
    })

    describe('when API call fails', () => {
      it('throws error when createPrn fails', async ({ server }) => {
        vi.mocked(createPrn).mockRejectedValue(new Error('API error'))

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })

      it('rethrows Boom errors from createPrn', async ({ server }) => {
        vi.mocked(createPrn).mockRejectedValue(Boom.badRequest('Invalid'))

        const { cookie, crumb } = await getCsrfToken(server, url, {
          auth: mockAuth
        })

        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.badRequest)
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

    it('returns 404 for valid payload (handler check)', async ({ server }) => {
      // Get CSRF token while feature is enabled
      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      // Disable feature flag before POST
      config.set('featureFlags.lprns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })

    it('returns 404 for invalid payload (failAction check)', async ({
      server
    }) => {
      // Get CSRF token while feature is enabled
      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      // Disable feature flag before POST with invalid payload
      config.set('featureFlags.lprns', false)

      try {
        const { statusCode } = await server.inject({
          method: 'POST',
          url,
          auth: mockAuth,
          headers: { cookie },
          payload: { ...validPayload, tonnage: '', crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.lprns', true)
      }
    })
  })
})
