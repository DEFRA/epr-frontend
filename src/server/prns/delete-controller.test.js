import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('./helpers/fetch-packaging-recycling-note.js'))
vi.mock(import('./helpers/update-prn-status.js'))

const { fetchPackagingRecyclingNote } =
  await import('./helpers/fetch-packaging-recycling-note.js')
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
const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
const listUrl = basePath
const deleteUrl = `${basePath}/${prnId}/delete`

const mockPrnAwaitingAuth = {
  id: prnId,
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_authorisation',
  issuedToOrganisation: 'Test Producer Ltd',
  createdAt: '2026-01-15T10:00:00Z'
}

const mockPrnIssued = {
  ...mockPrnAwaitingAuth,
  status: 'awaiting_acceptance'
}

describe('#deleteController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
      mockPrnAwaitingAuth
    )
    vi.mocked(updatePrnStatus).mockResolvedValue({
      ...mockPrnAwaitingAuth,
      status: 'deleted'
    })
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.prns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.prns')
    })

    describe('GET /delete (confirmation page)', () => {
      it('displays confirmation heading for PRN', async ({ server }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /Are you sure you want to delete this PRN/i)
        ).toBeDefined()
      })

      it('displays warning text about deleting', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(
            main,
            /This will permanently delete the PRN. The tonnage will be returned to your available waste balance./i
          )
        ).toBeDefined()
      })

      it('displays confirm delete button with warning style', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const button = getByRole(main, 'button', {
          name: /Delete PRN/i
        })
        expect(button).toBeDefined()
        expect(button.classList.contains('govuk-button--warning')).toBe(true)
      })

      it('displays back link to PRN view page', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')
        expect(backLink).toBeDefined()
        expect(backLink.getAttribute('href')).toBe(`${basePath}/${prnId}`)
      })

      it('displays PERN wording for exporter registration', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /Are you sure you want to delete this PERN/i)
        ).toBeDefined()
      })

      it('redirects to list when PRN is not in awaiting_authorisation status', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockPrnIssued)

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(listUrl)
      })

      it('returns 404 when PRN not found', async ({ server }) => {
        const Boom = await import('@hapi/boom')
        vi.mocked(fetchPackagingRecyclingNote).mockRejectedValue(
          Boom.default.notFound('PRN not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: deleteUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })

    describe('POST /delete (confirm delete)', () => {
      it('deletes PRN and redirects to list page', async ({ server }) => {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          deleteUrl,
          { auth: mockAuth }
        )

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: deleteUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(listUrl)
        expect(updatePrnStatus).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          { status: 'deleted' },
          mockCredentials.idToken
        )
      })

      it('redirects to list when PRN is not in awaiting_authorisation status', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockPrnIssued)

        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          deleteUrl,
          { auth: mockAuth }
        )

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: deleteUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(listUrl)
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
          deleteUrl,
          { auth: mockAuth }
        )

        const { statusCode } = await server.inject({
          method: 'POST',
          url: deleteUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
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
          deleteUrl,
          { auth: mockAuth }
        )

        const { statusCode } = await server.inject({
          method: 'POST',
          url: deleteUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.forbidden)
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
          url: deleteUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })

    it('returns 404 for POST', async ({ server }) => {
      config.set('featureFlags.prns', false)

      try {
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          deleteUrl,
          { auth: mockAuth }
        )

        const { statusCode } = await server.inject({
          method: 'POST',
          url: deleteUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        config.set('featureFlags.prns', true)
      }
    })
  })
})
