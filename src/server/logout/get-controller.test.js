import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { paths } from '#server/paths.js'
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
      signOutSuccess: (oidcProvider) => mockSignOutSuccessMetric(oidcProvider)
    }
  })
)

vi.mock(import('@defra/cdp-auditing'), () => ({
  audit: (...args) => mockCdpAuditing(...args)
}))

describe('#logoutController - integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when user is logged in to Defra ID', () => {
    const mockAuth = buildMockAuth({
      idToken: 'test-id-token',
      profile: {
        id: 'user-id',
        email: 'user@email.com'
      },
      provider: OIDC_DEFRA_ID,
      urls: {
        token: 'http://defra-id.auth/token',
        logout: 'http://defra-id.auth/logout'
      }
    })

    it('should redirect to logged-out page via Defra ID', async ({
      server
    }) => {
      const response = await server.inject({
        method: 'GET',
        url: paths.logout,
        auth: mockAuth
      })

      expect(response.statusCode).toBe(statusCodes.found)

      const redirectUrl = new URL(
        /** @type {string} */ (response.headers.location)
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
        url: paths.logout,
        auth: mockAuth
      })

      expect(mockCdpAuditing).toHaveBeenCalledTimes(1)
      expect(mockCdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
          action: 'sign-out'
        },
        context: {
          oidcProvider: OIDC_DEFRA_ID
        },
        user: {
          id: 'user-id',
          email: 'user@email.com'
        }
      })
    })

    it('should record sign out success metric', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: paths.logout,
        auth: mockAuth
      })

      expect(mockSignOutSuccessMetric).toHaveBeenCalledTimes(1)
      expect(mockSignOutSuccessMetric).toHaveBeenCalledWith('defra-id')
    })
  })

  describe('when user is logged in to Entra ID', () => {
    const mockAuth = buildMockAuth({
      idToken: 'test-id-token',
      profile: {
        id: 'user-id',
        email: 'user@email.com'
      },
      provider: OIDC_ENTRA_ID,
      urls: {
        token: 'http://entra-id.auth/token',
        logout: 'http://entra-id.auth/logout'
      }
    })

    it('should redirect to logged-out page via Entra ID', async ({
      server
    }) => {
      const response = await server.inject({
        method: 'GET',
        url: paths.logout,
        auth: mockAuth
      })

      expect(response.statusCode).toBe(statusCodes.found)

      const redirectUrl = new URL(
        /** @type {string} */ (response.headers.location)
      )

      expect(redirectUrl.host).toBe('entra-id.auth')
      expect(redirectUrl.pathname).toBe('/logout')
      expect(redirectUrl.searchParams.get('post_logout_redirect_uri')).toBe(
        'http://localhost:3000/auth/logout'
      )
    })

    it('should audit a successful sign out attempt', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: paths.logout,
        auth: mockAuth
      })

      expect(mockCdpAuditing).toHaveBeenCalledTimes(1)
      expect(mockCdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
          action: 'sign-out'
        },
        context: {
          oidcProvider: 'entra-id'
        },
        user: {
          id: 'user-id',
          email: 'user@email.com'
        }
      })
    })

    it('should record sign out success metric', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: paths.logout,
        auth: mockAuth
      })

      expect(mockSignOutSuccessMetric).toHaveBeenCalledTimes(1)
      expect(mockSignOutSuccessMetric).toHaveBeenCalledWith('entra-id')
    })
  })

  describe('when user is not logged in', () => {
    it('should redirect to logged-out page', async ({ server }) => {
      const response = await server.inject({
        method: 'GET',
        url: paths.logout
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe('/logged-out')
    })

    it('should not audit a successful sign out attempt', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: paths.logout
      })

      expect(mockCdpAuditing).not.toHaveBeenCalled()
    })

    it('should not record sign out success metric', async ({ server }) => {
      await server.inject({
        method: 'GET',
        url: paths.logout
      })

      expect(mockSignOutSuccessMetric).not.toHaveBeenCalled()
    })
  })
})
