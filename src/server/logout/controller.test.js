import { config } from '#config/config.js'
import { dropUserSession } from '#server/auth/helpers/drop-user-session.js'
import { logoutController } from '#server/logout/controller.js'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'

vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(import('#server/auth/helpers/drop-user-session.js'))

const appBaseUrl = 'http://localhost:3000'
const loggedOutSlug = 'logged-out'
const loggedOutUrl = `${appBaseUrl}/${loggedOutSlug}`

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

describe('#logoutController - integration', () => {
  /** @type {import('@hapi/hapi').Server} */
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  beforeEach(async () => {
    mockOidcServer.listen()
    config.load({
      defraId: {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        oidcConfigurationUrl:
          'http://defra-id.auth/.well-known/openid-configuration',
        serviceId: 'test-service-id'
      }
    })
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    mockOidcServer.resetHandlers()
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
  })

  afterAll(() => {
    mockOidcServer.close()
  })

  describe('when user is logged in', () => {
    let response

    beforeEach(async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          id: 'user-id',
          email: 'user@email.com',
          idToken: 'mock-jwt-token',
          displayName: 'Test User',
          logoutUrl: 'http://defra-id.auth/logout'
        }
      })

      response = await server.inject({
        method: 'GET',
        url: '/logout',
        auth: {
          strategy: 'session',
          credentials: { isAuthenticated: true }
        }
      })
    })

    test('redirects to logged-out page via Defra ID', async () => {
      expect(response.statusCode).toBe(statusCodes.found)

      const redirectUrl = response.headers.location

      expect(redirectUrl).toBeInstanceOf(URL)
      expect(redirectUrl.host).toBe('defra-id.auth')
      expect(redirectUrl.pathname).toBe('/logout')
      expect(redirectUrl.searchParams.get('post_logout_redirect_uri')).toBe(
        'http://localhost:3000/logged-out'
      )
    })

    test('audits a successful sign out attempt', () => {
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

    test('records sign out success metric', () => {
      expect(mockSignOutSuccessMetric).toHaveBeenCalledTimes(1)
    })
  })

  describe('when user is not logged in', () => {
    test('redirects to logged-out page', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/logout'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe('/logged-out')
    })
  })
})

describe('#logoutController', () => {
  describe('when user is not authenticated', () => {
    test('should redirect to home when authedUser is null', async () => {
      const mockRequest = {
        pre: {
          authedUser: null
        },
        localiseUrl: vi.fn((key) => key)
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        `/${loggedOutSlug}`
      )
      expect(result).toBe('redirect-response')
    })
  })

  describe('when user is authenticated', () => {
    test('should drop session, clear cookie and redirect to logout URL', async () => {
      const mockAuthedUser = {
        idToken: 'id-token-123',
        logoutUrl: 'http://localhost:3200/logout?p=a-b2clogin-query-param'
      }

      const mockRequest = {
        cookieAuth: {
          clear: vi.fn()
        },
        localiseUrl: vi.fn((key) => key),
        pre: {
          authedUser: mockAuthedUser
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
      expect(mockRequest.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        new URL(
          `http://localhost:3200/logout?p=a-b2clogin-query-param&id_token_hint=id-token-123&post_logout_redirect_uri=${encodeURIComponent(loggedOutUrl)}`
        )
      )
      expect(result).toBe('redirect-response')
    })
  })
})
