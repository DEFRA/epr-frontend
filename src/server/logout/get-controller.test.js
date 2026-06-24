import { Metrics } from '@defra/cdp-metrics'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/drop-user-session.js'))

const counterSpy = vi.spyOn(Metrics.prototype, 'counter').mockResolvedValue()
const mockCdpAuditing = vi.fn()

vi.mock(import('@defra/cdp-auditing'), () => ({
  audit: (...args) => mockCdpAuditing(...args)
}))

const mockAuth = buildMockAuth({
  idToken: 'test-id-token',
  profile: { id: 'user-id', email: 'user@email.com' }
})

describe('#logoutController - integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when user is logged in', () => {
    it('should redirect to logged-out page via Defra ID', async ({
      server
    }) => {
      const response = await server.inject({
        method: 'GET',
        url: '/logout',
        auth: mockAuth
      })

      expect(response.statusCode).toBe(statusCodes.found)

      const redirectUrl = new URL(
        /** @type {string} */ (response.headers['location'])
      )

      expect(redirectUrl.host).toBe('defra-id.auth')
      expect(redirectUrl.pathname).toBe('/logout')
      expect(redirectUrl.searchParams.get('post_logout_redirect_uri')).toBe(
        'http://localhost:3000/auth/logout'
      )
    })

    it('should audit a successful sign out attempt', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: '/logout',
        auth: mockAuth
      })

      expect(mockCdpAuditing).toHaveBeenCalledTimes(1)
      expect(mockCdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
          action: 'sign-out'
        },
        context: {},
        user: {
          id: 'user-id',
          email: 'user@email.com'
        }
      })
    })

    it('should record sign out success metric', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: '/logout',
        auth: mockAuth
      })

      expect(counterSpy).toHaveBeenCalledWith('signOutSuccess')
    })
  })

  describe('when user is not logged in', () => {
    it('should redirect to logged-out page', async ({ server }) => {
      const response = await server.inject({
        method: 'GET',
        url: '/logout'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe('/logged-out')
    })

    it('should not audit a successful sign out attempt', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: '/logout'
      })

      expect(mockCdpAuditing).not.toHaveBeenCalled()
    })

    it('should not record sign out success metric', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: '/logout'
      })

      expect(counterSpy).not.toHaveBeenCalledWith('signOutSuccess')
    })
  })
})
