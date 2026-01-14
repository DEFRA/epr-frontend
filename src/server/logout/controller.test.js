import { dropUserSession } from '#server/auth/helpers/drop-user-session.js'
import { logoutController } from '#server/logout/controller.js'
import { describe, expect, test, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/drop-user-session.js'))

const appBaseUrl = 'http://localhost:3000'
const loggedOutSlug = 'logged-out'
const loggedOutUrl = `${appBaseUrl}/${loggedOutSlug}`

describe('#logoutController', () => {
  describe('when user is not authenticated', () => {
    test('should redirect to home when auth credentials is null', async () => {
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
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        `/${loggedOutSlug}`
      )
      expect(result).toBe('redirect-response')
    })
  })

  describe('when user is authenticated', () => {
    const mockSession = {
      idToken: 'id-token-123',
      profile: {
        id: 'user-id'
      },
      urls: {
        logout: 'http://localhost:3200/logout?p=a-b2clogin-query-param'
      }
    }

    test('should drop session, clear cookie and redirect to logout URL', async () => {
      const mockRequest = {
        cookieAuth: {
          clear: vi.fn()
        },
        localiseUrl: vi.fn((key) => key),
        auth: {
          credentials: mockSession
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

    test('should localise the post_logout_redirect_uri for Welsh users', async () => {
      const mockRequest = {
        cookieAuth: {
          clear: vi.fn()
        },
        localiseUrl: vi.fn((path) => `/cy${path}`),
        auth: {
          credentials: mockSession
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      await logoutController.handler(mockRequest, mockH)

      const expectedRedirectUri = `${appBaseUrl}/cy/${loggedOutSlug}`
      const redirectUrl = mockH.redirect.mock.calls[0][0]

      expect(redirectUrl.searchParams.get('post_logout_redirect_uri')).toBe(
        expectedRedirectUri
      )
    })
  })
})
