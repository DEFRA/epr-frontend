import { controller } from '#server/auth/callback/controller.js'
import { describe, expect, test, vi } from 'vitest'

vi.mock(import('node:crypto'), () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234')
}))

describe('#authCallbackController', () => {
  describe('when user is authenticated', () => {
    test('should create session and redirect to flash referrer', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User'
      }

      const mockExpiresInSeconds = 3600

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            token: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: mockExpiresInSeconds
          }
        },
        server: {
          app: {
            cache: {
              set: vi.fn().mockResolvedValue(undefined)
            }
          }
        },
        cookieAuth: {
          set: vi.fn()
        },
        logger: {
          info: vi.fn(),
          error: vi.fn()
        },
        yar: {
          flash: vi.fn().mockReturnValue(['/dashboard'])
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockRequest.server.app.cache.set).toHaveBeenCalledExactlyOnceWith(
        'mock-uuid-1234',
        {
          ...mockProfile,
          isAuthenticated: true,
          token: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: mockExpiresInSeconds * 1000,
          expiresAt: expect.any(Date)
        }
      )

      expect(mockRequest.cookieAuth.set).toHaveBeenCalledExactlyOnceWith({
        sessionId: 'mock-uuid-1234'
      })

      expect(mockRequest.yar.flash).toHaveBeenCalledExactlyOnceWith('referrer')

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/dashboard')
      expect(result).toBe('redirect-response')
    })

    test('should redirect to home when no flash referrer', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            token: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600
          }
        },
        server: {
          app: {
            cache: {
              set: vi.fn().mockResolvedValue(undefined)
            }
          }
        },
        cookieAuth: {
          set: vi.fn()
        },
        logger: {
          info: vi.fn(),
          error: vi.fn()
        },
        yar: {
          flash: vi.fn().mockReturnValue([])
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/')
      expect(result).toBe('redirect-response')
    })
  })

  describe('when user is not authenticated', () => {
    test('should redirect without creating session', async () => {
      const mockRequest = {
        auth: {
          isAuthenticated: false
        },
        server: {
          app: {
            cache: {
              set: vi.fn()
            }
          }
        },
        cookieAuth: {
          set: vi.fn()
        },
        logger: {
          info: vi.fn()
        },
        yar: {
          flash: vi.fn().mockReturnValue(['/login'])
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockRequest.server.app.cache.set).not.toHaveBeenCalled()
      expect(mockRequest.cookieAuth.set).not.toHaveBeenCalled()
      expect(mockRequest.logger.info).not.toHaveBeenCalled()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/login')
      expect(result).toBe('redirect-response')
    })
  })
})
