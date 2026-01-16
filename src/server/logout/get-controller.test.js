import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/drop-user-session.js'))

const mockSignOutSuccessMetric = vi.fn()
const mockCdpAuditing = vi.fn()

vi.mock(
  import('#server/common/helpers/metrics/index.js'),
  async (importOriginal) => ({
    metrics: {
      ...(await importOriginal()).metrics,
      signOutSuccess: () => mockSignOutSuccessMetric()
    }
  })
)

vi.mock(import('@defra/cdp-auditing'), () => ({
  audit: (...args) => mockCdpAuditing(...args)
}))

const mockAuth = {
  strategy: 'session',
  credentials: {
    idToken: 'test-id-token',
    profile: {
      id: 'user-id',
      email: 'user@email.com'
    },
    urls: {
      logout: 'http://defra-id.auth/logout'
    }
  }
}

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

      const redirectUrl = response.headers.location

      expect(redirectUrl).toBeInstanceOf(URL)
      expect(redirectUrl.host).toBe('defra-id.auth')
      expect(redirectUrl.pathname).toBe('/logout')
      expect(redirectUrl.searchParams.get('post_logout_redirect_uri')).toBe(
        'http://localhost:3000/logged-out'
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
          subCategory: 'sso',
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

      expect(mockSignOutSuccessMetric).toHaveBeenCalledTimes(1)
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

      expect(mockSignOutSuccessMetric).not.toHaveBeenCalled()
    })
  })
})
