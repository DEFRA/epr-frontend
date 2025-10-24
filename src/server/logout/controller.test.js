import { describe, expect, test, vi } from 'vitest'
import { dropUserSession } from '#server/common/helpers/auth/drop-user-session.js'
import { logoutController } from '#server/logout/controller.js'

vi.mock(import('#server/common/helpers/auth/drop-user-session.js'))

describe('#logoutController', () => {
  describe('when user is not authenticated', () => {
    test('should redirect to home when authedUser is empty', async () => {
      const mockRequest = {
        pre: {
          authedUser: {}
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/')
      expect(result).toBe('redirect-response')
    })

    test('should redirect to home when authedUser is null', async () => {
      const mockRequest = {
        pre: {
          authedUser: null
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/')
      expect(result).toBe('redirect-response')
    })
  })

  describe('when user is authenticated', () => {
    test('should drop session, clear cookie and redirect to logout URL', async () => {
      const mockAuthedUser = {
        idToken: 'id-token-123',
        logoutUrl: 'http://localhost:3200/logout'
      }

      const mockRequest = {
        pre: {
          authedUser: mockAuthedUser
        },
        info: {
          referrer: 'http://localhost:3000/dashboard'
        },
        cookieAuth: {
          clear: vi.fn()
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
      expect(mockRequest.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        'http://localhost:3200/logout?id_token_hint=id-token-123&post_logout_redirect_uri=http://localhost:3000/dashboard'
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle special characters in referrer URL', async () => {
      const mockAuthedUser = {
        idToken: 'id-token-456',
        logoutUrl: 'http://localhost:3200/logout'
      }

      const mockRequest = {
        pre: {
          authedUser: mockAuthedUser
        },
        info: {
          referrer: 'http://localhost:3000/page?param=value&other=test'
        },
        cookieAuth: {
          clear: vi.fn()
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await logoutController.handler(mockRequest, mockH)

      expect(dropUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
      expect(mockRequest.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        'http://localhost:3200/logout?id_token_hint=id-token-456&post_logout_redirect_uri=http://localhost:3000/page?param=value&other=test'
      )
      expect(result).toBe('redirect-response')
    })
  })
})
