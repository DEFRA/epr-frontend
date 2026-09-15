import { config } from '#config/config.js'
import { dropUserSession } from '#server/auth/helpers/drop-user-session.js'
import { SIGN_IN_PROVIDER_COOKIE } from '#server/auth/helpers/sign-in-provider.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { logoutController } from '#server/logout/controller.js'
import {
  mockHapiRequest,
  asResponseToolkit
} from '#server/common/test-helpers/request-fixtures.js'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/drop-user-session.js'))

describe('#logoutController', () => {
  afterEach(() => {
    config.reset('appBaseUrl')
    config.reset('featureFlags.regulatorAccess')
  })

  describe('when user is not authenticated', () => {
    test('should redirect to logged-out page when auth credentials is null', async () => {
      const mockRequest = {
        auth: {
          credentials: null
        },
        state: {},
        localiseUrl: vi.fn((key) => key)
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(
        mockHapiRequest(mockRequest),
        asResponseToolkit(mockH)
      )

      expect(dropUserSession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/logged-out')
      expect(result).toBe('redirect-response')
    })

    test('should redirect a regulator whose session lapsed to the regulator logged-out page', async () => {
      config.set('featureFlags.regulatorAccess', true)

      const mockRequest = {
        auth: {
          credentials: null
        },
        state: { [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID },
        localiseUrl: vi.fn((key) => key)
      }

      const mockH = {
        redirect: vi.fn()
      }

      await logoutController.handler(
        mockHapiRequest(mockRequest),
        asResponseToolkit(mockH)
      )

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        '/regulators/logged-out'
      )
    })
  })

  describe('when user is authenticated', () => {
    const appHost = 'localhost:3000'
    const appBaseUrl = `http://${appHost}`

    const mockSession = {
      provider: OIDC_ENTRA_ID,
      idToken: 'id-token-123',
      backendToken: 'access-token-123',
      profile: {
        id: 'user-id',
        email: 'test@example.com'
      },
      urls: {
        logout: 'http://oidc-provider/logout?p=a-b2clogin-query-param'
      }
    }

    const requestFor = (session) => ({
      cookieAuth: {
        clear: vi.fn()
      },
      localiseUrl: vi.fn((key) => key),
      auth: {
        credentials: session
      },
      info: { host: appHost },
      headers: {},
      server: { info: { protocol: 'http' } }
    })

    test('should drop session and redirect to logout URL', async () => {
      const authLogoutUrl = `${appBaseUrl}/auth/logout`

      config.set('appBaseUrl', appBaseUrl)

      const mockRequest = requestFor(mockSession)

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response'),
        state: vi.fn()
      }

      const result = await logoutController.handler(
        mockHapiRequest(mockRequest),
        asResponseToolkit(mockH)
      )

      expect(mockH.state).toHaveBeenCalledExactlyOnceWith(
        SIGN_IN_PROVIDER_COOKIE,
        OIDC_ENTRA_ID
      )
      expect(dropUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
      expect(mockRequest.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        `http://oidc-provider/logout?p=a-b2clogin-query-param&id_token_hint=id-token-123&post_logout_redirect_uri=${encodeURIComponent(authLogoutUrl)}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should not remember an operator sign in', async () => {
      config.set('appBaseUrl', appBaseUrl)

      const mockH = {
        redirect: vi.fn(),
        state: vi.fn()
      }

      await logoutController.handler(
        mockHapiRequest(
          requestFor({ ...mockSession, provider: OIDC_DEFRA_ID })
        ),
        asResponseToolkit(mockH)
      )

      expect(mockH.state).not.toHaveBeenCalled()
    })
  })
})
