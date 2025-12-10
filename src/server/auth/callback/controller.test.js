import { controller } from '#server/auth/callback/controller.js'
import * as fetchUserOrganisationsModule from '#server/common/helpers/organisations/fetch-user-organisations.js'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('node:crypto'), () => ({
  randomUUID: vi.fn(() => 'mock-uuid-1234')
}))

vi.mock(
  import('#server/common/helpers/organisations/fetch-user-organisations.js')
)

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

      const mockExpiresInSeconds = 3600

      const mockOrganisations = {
        organisations: {
          current: {
            id: 'current-org-id',
            name: 'Test Company',
            tradingName: 'Test Trading Name',
            companiesHouseNumber: '12345678'
          },
          linked: {
            id: 'linked-org-id',
            name: 'Linked Company',
            linkedBy: {
              email: 'user@example.com',
              id: 'user-123'
            },
            linkedAt: '2025-12-10T09:00:00.000Z'
          },
          unlinked: []
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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
          expiresAt: expect.any(Date),
          organisations: mockOrganisations.organisations
        }
      )

      expect(mockRequest.cookieAuth.set).toHaveBeenCalledExactlyOnceWith({
        sessionId: 'mock-uuid-1234'
      })

      expect(mockRequest.yar.flash).toHaveBeenCalledExactlyOnceWith('referrer')

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/dashboard')
      expect(result).toBe('redirect-response')
    })

    it('should redirect to home when no flash referrer', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockOrganisations = {
        organisations: {
          current: {
            id: 'current-org-id',
            name: 'Test Company',
            tradingName: 'Test Trading Name',
            companiesHouseNumber: '12345678'
          },
          linked: {
            id: 'linked-org-id',
            name: 'Linked Company',
            linkedBy: {
              email: 'user@example.com',
              id: 'user-123'
            },
            linkedAt: '2025-12-10T09:00:00.000Z'
          },
          unlinked: []
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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

    it('should fetch user organisations and add to session', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        organisations: {
          current: {
            id: 'current-org-id',
            name: 'Current Organisation',
            tradingName: 'Current Trading Name',
            companiesHouseNumber: '12345678'
          },
          unlinked: [
            {
              id: 'org-1',
              name: 'Test Company',
              tradingName: 'Test Trading',
              companiesHouseNumber: '11111111'
            },
            {
              id: 'org-2',
              name: 'Another Company',
              tradingName: 'Another Trading',
              companiesHouseNumber: '22222222'
            }
          ]
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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

    it('should redirect to /account/linking when exactly one unlinked organisation', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockOrganisations = {
        organisations: {
          current: {
            id: 'current-org-id',
            name: 'Current Organisation',
            tradingName: 'Current Trading Name',
            companiesHouseNumber: '12345678'
          },
          unlinked: [
            {
              id: 'org-1',
              name: 'Test Company',
              tradingName: 'Test Trading',
              companiesHouseNumber: '11111111'
            }
          ]
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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
    it('should redirect without creating session', async () => {
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

  describe('error handling', () => {
    it('should throw error when fetching organisations fails', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockError = new Error('Backend returned 500: Internal Server Error')
      mockError.status = 500

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockRejectedValue(mockError))

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
          flash: vi.fn().mockReturnValue(['/dashboard'])
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      await expect(controller.handler(mockRequest, mockH)).rejects.toThrow(
        'Backend returned 500: Internal Server Error'
      )

      expect(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).toHaveBeenCalledExactlyOnceWith({ logger: mockRequest.logger })
      expect(mockRequest.server.app.cache.set).not.toHaveBeenCalled()
      expect(mockRequest.cookieAuth.set).not.toHaveBeenCalled()
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
        organisations: {
          current: {
            id: 'current-org-id',
            name: 'Gaskells Waste Services',
            tradingName: 'Gaskells Trading',
            companiesHouseNumber: '12345678'
          },
          linked: {
            id: 'linked-org-id',
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
              tradingName: 'Unlinked Trading 1',
              companiesHouseNumber: '11111111'
            }
          ]
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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
        organisations: {
          current: {
            id: 'current-org-id',
            companyDetails: {
              name: 'Gaskells Waste Services',
              number: '12345678'
            }
          },
          unlinked: [
            {
              id: 'unlinked-org-1',
              companyDetails: {
                name: 'Unlinked Organisation 1',
                number: '11111111'
              }
            },
            {
              id: 'unlinked-org-2',
              companyDetails: {
                name: 'Unlinked Organisation 2',
                number: '22222222'
              }
            }
          ]
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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
        organisations: {
          current: {
            id: 'current-org-id',
            companyDetails: {
              name: 'Gaskells Waste Services',
              number: '12345678'
            }
          },
          unlinked: []
        }
      }

      vi.mocked(
        fetchUserOrganisationsModule.fetchUserOrganisations
      ).mockImplementation(() => vi.fn().mockResolvedValue(mockOrganisations))

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
