import { config } from '#config/config.js'
import { dropUserSession } from '#server/auth/helpers/drop-user-session.js'
import { logoutController } from '#server/logout/controller.js'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/drop-user-session.js'))

const appBaseUrl = 'http://localhost:3000'
const authLogoutUrl = `${appBaseUrl}/auth/logout`

describe('#logoutController', () => {
  afterEach(() => {
    config.reset('appBaseUrl')
  })

  describe('when user is not authenticated', () => {
    test('should redirect to logged-out page when auth credentials is null', async () => {
      const mockRequest = {
        auth: {
          credentials: null
        },
        localiseUrl: vi.fn((key) => key)
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/logged-out')
      expect(result).toBe('redirect-response')
    })
  })

  describe('when user is authenticated', () => {
    const mockSession = {
      idToken: 'id-token-123',
      profile: {
        id: 'user-id',
        email: 'test@example.com'
      },
      urls: {
        logout: 'http://localhost:3200/logout?p=a-b2clogin-query-param'
      }
    }

    test('should drop session and redirect to logout URL', async () => {
      config.set('appBaseUrl', appBaseUrl)

      const mockRequest = {
        cookieAuth: {
          clear: vi.fn()
        },
        localiseUrl: vi.fn((key) => key),
        auth: {
          credentials: mockSession
        },
        info: { host: 'localhost:3000' },
        headers: {},
        server: { info: { protocol: 'http' } }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
      expect(mockRequest.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        new URL(
          `http://localhost:3200/logout?p=a-b2clogin-query-param&id_token_hint=id-token-123&post_logout_redirect_uri=${encodeURIComponent(authLogoutUrl)}`
        )
      )
      expect(result).toBe('redirect-response')
    })
  })
})
