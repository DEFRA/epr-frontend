import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(import('./helpers/update-prn-status.js'))

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

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const issueUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/issue`
const actionUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/view`
const issuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/issued`

const mockPrnIssued = {
  id: 'prn-789',
  status: 'awaiting_acceptance',
  prnNumber: 'ER2625001A'
}

describe('#issueController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updatePrnStatus).mockResolvedValue(mockPrnIssued)
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.lprns', true)
    })

    afterAll(() => {
      config.reset('featureFlags.lprns')
    })

    it('updates PRN status to awaiting_acceptance and redirects to issued page', async ({
      server
    }) => {
      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        server,
        viewUrl,
        { auth: mockAuth }
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(issuedUrl)
      expect(updatePrnStatus).toHaveBeenCalledWith(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'awaiting_acceptance' },
        mockCredentials.idToken
      )
    })

    it('returns 500 when updatePrnStatus fails with non-Boom error', async ({
      server
    }) => {
      vi.mocked(updatePrnStatus).mockRejectedValueOnce(
        new Error('Backend error')
      )

      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        server,
        viewUrl,
        { auth: mockAuth }
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('redirects to action page with error when backend returns 409 conflict', async ({
      server
    }) => {
      const Boom = await import('@hapi/boom')
      vi.mocked(updatePrnStatus).mockRejectedValueOnce(
        Boom.default.conflict('Insufficient total waste balance')
      )

      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        server,
        viewUrl,
        { auth: mockAuth }
      )

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(`${actionUrl}?error=insufficient_balance`)
    })

    it('re-throws non-conflict Boom errors from updatePrnStatus', async ({
      server
    }) => {
      const Boom = await import('@hapi/boom')
      vi.mocked(updatePrnStatus).mockRejectedValueOnce(
        Boom.default.forbidden('Not authorised')
      )

      const { cookie: csrfCookie, crumb } = await getCsrfToken(
        server,
        viewUrl,
        { auth: mockAuth }
      )

      const { statusCode } = await server.inject({
        method: 'POST',
        url: issueUrl,
        auth: mockAuth,
        headers: { cookie: csrfCookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
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
        const { cookie: csrfCookie, crumb } = await getCsrfToken(
          server,
          viewUrl,
          { auth: mockAuth }
        )

        const { statusCode } = await server.inject({
          method: 'POST',
          url: issueUrl,
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
