import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { describe, expect } from 'vitest'
import { it } from '#vite/fixtures/server.js'

const mockCredentials = {
  profile: {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

describe('#accountLinkingController', () => {
  describe('csrf protection', () => {
    it('should reject POST request without CSRF token', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/account/linking',
        auth: mockAuth,
        payload: {
          organisationId: 'org-1'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('should reject POST request with invalid CSRF token', async ({
      server
    }) => {
      const { cookie } = await getCsrfToken(server, '/account/linking', {
        auth: mockAuth
      })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/account/linking',
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb: 'invalid-token',
          organisationId: 'org-1'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})
