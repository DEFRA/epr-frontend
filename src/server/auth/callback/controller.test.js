import { controller } from '#server/auth/callback/controller.js'
import * as fetchUserOrganisationsModule from '#server/auth/helpers/fetch-user-organisations.js'
import Boom from '@hapi/boom'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('node:crypto'), () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234')
}))

vi.mock(import('#server/auth/helpers/fetch-user-organisations.js'))

describe('#authCallbackController', () => {
  describe('when user is authenticated', () => {
    it('should create session and redirect to flash referrer', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User'
      }

      const mockOrganisations = {
        current: {
          id: 'defra-org-uuid',
          name: 'Test Defra Organisation'
        },
        linked: {
          id: 'defra-org-uuid',
          name: 'Test Defra Organisation',
          linkedBy: {
            email: 'user@example.com',
            id: 'user-123'
          },
          linkedAt: '2025-12-10T09:00:00.000Z'
        },
        unlinked: []
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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

      // First call stores initial session, second call adds linkedOrganisationId
      expect(mockRequest.server.app.cache.set).toHaveBeenCalledTimes(2)
      expect(mockRequest.server.app.cache.set).toHaveBeenNthCalledWith(
        2,
        'mock-uuid-1234',
        {
          profile: mockProfile,
          idToken: 'mock-id-token',
          expiresAt: expect.any(String),
          refreshToken: 'mock-refresh-token',
          urls: {
            token: 'http://test.auth/token',
            logout: 'http://test.auth/logout'
          },
          linkedOrganisationId: 'defra-org-uuid'
        }
      )

      expect(mockRequest.cookieAuth.set).toHaveBeenCalledExactlyOnceWith({
        sessionId: 'mock-uuid-1234'
      })

      expect(mockRequest.yar.flash).toHaveBeenCalledExactlyOnceWith('referrer')

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/dashboard')
      // eslint-disable-next-line vitest/max-expects
      expect(result).toBe('redirect-response')
    })

    it.each([
      {
        referrer: '/start',
        description: 'start page',
        isWelsh: false
      },
      {
        referrer: '/cy/start',
        description: 'Welsh start page',
        isWelsh: true
      },
      {
        referrer: '/logged-out',
        description: 'logged-out page',
        isWelsh: false
      },
      {
        referrer: '/cy/logged-out',
        description: 'Welsh logged-out page',
        isWelsh: true
      }
    ])(
      'should redirect to organisation dashboard when referrer is $referrer (not back to $description)',
      async ({ referrer, isWelsh }) => {
        const mockProfile = {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          idToken: 'mock-id-token'
        }

        const mockOrganisations = {
          current: {
            id: 'defra-org-uuid',
            name: 'Test Defra Organisation'
          },
          linked: {
            id: 'linked-org-uuid',
            name: 'Test Defra Organisation',
            linkedBy: {
              email: 'user@example.com',
              id: 'user-123'
            },
            linkedAt: '2025-12-10T09:00:00.000Z'
          },
          unlinked: []
        }

        vi.mocked(
          fetchUserOrganisationsModule.fetchUserOrganisations
        ).mockResolvedValue(mockOrganisations)

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
            flash: vi.fn().mockReturnValue([referrer])
          },
          localiseUrl: vi.fn((url) => (isWelsh ? `/cy${url}` : url))
        }

        const mockH = {
          redirect: vi.fn().mockReturnValue('redirect-response')
        }

        const result = await controller.handler(mockRequest, mockH)

        const expectedRedirect = isWelsh
          ? '/cy/organisations/linked-org-uuid'
          : '/organisations/linked-org-uuid'

        expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(expectedRedirect)
        expect(result).toBe('redirect-response')
      }
    )

    it('should redirect to organisation account home when no flash referrer and has linked org', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockOrganisations = {
        current: {
          id: 'defra-org-uuid',
          name: 'Test Defra Organisation'
        },
        linked: {
          id: 'linked-org-uuid',
          name: 'Test Defra Organisation',
          linkedBy: {
            email: 'user@example.com',
            id: 'user-123'
          },
          linkedAt: '2025-12-10T09:00:00.000Z'
        },
        unlinked: []
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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
        },
        localiseUrl: vi.fn((url) => url)
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockRequest.localiseUrl).toHaveBeenCalledExactlyOnceWith(
        '/organisations/linked-org-uuid'
      )
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        '/organisations/linked-org-uuid'
      )
      expect(result).toBe('redirect-response')
    })

    it('should fetch user organisations and check linking status', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        current: {
          id: 'current-org-id',
          name: 'Current Organisation'
        },
        linked: {
          id: 'linked-org-id',
          name: 'Linked Organisation',
          linkedBy: {
            email: 'user@example.com',
            id: 'user-123'
          },
          linkedAt: '2025-12-10T09:00:00.000Z'
        },
        unlinked: [
          {
            id: 'org-1',
            name: 'Test Company',
            orgId: '11111111'
          },
          {
            id: 'org-2',
            name: 'Another Company',
            orgId: '22222222'
          }
        ]
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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
        },
        localiseUrl: vi.fn((url) => url)
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      await controller.handler(mockRequest, mockH)

      expect(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).toHaveBeenCalledExactlyOnceWith('mock-id-token')

      expect(mockRequest.server.app.cache.set).toHaveBeenCalledWith(
        'mock-uuid-1234',
        expect.not.objectContaining({
          organisations: expect.anything()
        })
      )
    })

    it('should redirect to /account/linking when exactly one unlinked organisation', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        current: {
          id: 'defra-org-uuid',
          name: 'Test Defra Organisation'
        },
        linked: null,
        unlinked: [
          {
            id: 'org-1',
            name: 'Test Company',
            orgId: '11111111'
          }
        ]
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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
    it('should redirect to referrer without creating session', async () => {
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

    it('should redirect to home when no referrer and not authenticated', async () => {
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
          flash: vi.fn().mockReturnValue([])
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockRequest.server.app.cache.set).not.toHaveBeenCalled()
      expect(mockRequest.cookieAuth.set).not.toHaveBeenCalled()
      expect(mockRequest.logger.info).not.toHaveBeenCalled()

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/')
      expect(result).toBe('redirect-response')
    })
  })

  describe('error handling', () => {
    it('should throw Boom error when fetching organisations fails', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const boomError = Boom.badImplementation('Internal Server Error')

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockRejectedValue(boomError)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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

      await expect(
        controller.handler(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500
        }
      })

      expect(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).toHaveBeenCalledExactlyOnceWith('mock-id-token')
      expect(mockRequest.server.app.cache.set).toHaveBeenCalledWith(
        'mock-uuid-1234',
        expect.any(Object)
      )
      expect(mockRequest.cookieAuth.set).toHaveBeenCalledWith({
        sessionId: 'mock-uuid-1234'
      })
    })
  })

  describe('organisation linking flow with new API structure', () => {
    it('should not redirect to /account/linking when organisation has linked organisation', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        current: {
          id: 'defra-org-uuid',
          name: 'Defra Registered Company Ltd'
        },
        linked: {
          id: 'defra-org-uuid',
          name: 'Defra Registered Company Ltd',
          linkedBy: {
            email: 'admin@example.com',
            id: 'admin-user-123'
          },
          linkedAt: '2025-12-09T10:30:00.000Z'
        },
        unlinked: [
          {
            id: 'unlinked-org-1',
            name: 'Unlinked Organisation 1',
            orgId: '11111111'
          }
        ]
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/dashboard')
      expect(result).toBe('redirect-response')
    })

    it('should redirect to /account/linking when no linked organisation and multiple unlinked organisations', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        current: {
          id: 'defra-org-uuid',
          name: 'Test Defra Organisation'
        },
        linked: null,
        unlinked: [
          {
            id: 'unlinked-org-1',
            name: 'Unlinked Organisation 1',
            orgId: '11111111'
          },
          {
            id: 'unlinked-org-2',
            name: 'Unlinked Organisation 2',
            orgId: '22222222'
          }
        ]
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/account/linking')
      expect(result).toBe('redirect-response')
    })

    it('should redirect to /account/linking when no linked organisation and no unlinked organisations', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        current: {
          id: 'defra-org-uuid',
          name: 'Test Defra Organisation'
        },
        linked: null,
        unlinked: []
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockResolvedValue(mockOrganisations)

      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            profile: mockProfile,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            urls: {
              token: 'http://test.auth/token',
              logout: 'http://test.auth/logout'
            }
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

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/account/linking')
      expect(result).toBe('redirect-response')
    })
  })
})
