import { controller } from '#server/auth/callback/controller.js'
import * as fetchUserOrganisationsModule from '#server/common/helpers/organisations/fetch-user-organisations.js'
import { describe, expect, test, vi } from 'vitest'

vi.mock(import('node:crypto'), () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234')
}))

vi.mock(
  import('#server/common/helpers/organisations/fetch-user-organisations.js')
)

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

    test('should fetch user organisations and add to session', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        organisations: {
          linked: [],
          unlinked: [
            {
              id: 'org-1',
              companyDetails: {
                tradingName: 'Test Company'
              }
            },
            {
              id: 'org-2',
              companyDetails: {
                tradingName: 'Another Company'
              }
            }
          ]
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockReturnValue(vi.fn().mockResolvedValue(mockOrganisations))

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

      await controller.handler(mockRequest, mockH)

      expect(mockRequest.server.app.cache.set).toHaveBeenCalledWith(
        'mock-uuid-1234',
        expect.objectContaining({
          organisations: mockOrganisations.organisations
        })
      )
    })

    test('should redirect to /account/linking when exactly one unlinked organisation', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        organisations: {
          linked: [],
          unlinked: [
            {
              id: 'org-1',
              companyDetails: {
                tradingName: 'Test Company'
              }
            }
          ]
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockReturnValue(vi.fn().mockResolvedValue(mockOrganisations))

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
          flash: vi.fn().mockReturnValue(['/some-page'])
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-to-linking')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/account/linking')
      expect(result).toBe('redirect-to-linking')
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
