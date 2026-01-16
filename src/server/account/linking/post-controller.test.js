import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { controller } from './post-controller.js'

describe('account linking POST controller', () => {
  const backendUrl = config.get('eprBackendUrl')
  const mockBackendServer = setupServer()

  beforeAll(() => {
    mockBackendServer.listen()
  })

  afterEach(() => {
    mockBackendServer.resetHandlers()
  })

  afterAll(() => {
    mockBackendServer.close()
  })

  describe('when validation passes', () => {
    it('should call backend link endpoint and redirect to organisation account home', async () => {
      const organisationId = 'org-123'
      const mockIdToken = 'mock-id-token'
      const mockSession = {
        idToken: mockIdToken
      }

      mockBackendServer.use(
        http.post(
          `${backendUrl}/v1/organisations/${organisationId}/link`,
          ({ request }) => {
            const authHeader = request.headers.get('Authorization')

            if (authHeader === `Bearer ${mockIdToken}`) {
              return HttpResponse.json({})
            }

            return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
          }
        )
      )

      const mockCacheSet = vi.fn().mockResolvedValue(undefined)
      const mockRequest = {
        payload: {
          organisationId
        },
        pre: {
          authedUser: mockSession
        },
        state: {
          userSession: {
            sessionId: 'mock-session-id'
          }
        },
        server: {
          app: {
            cache: {
              set: mockCacheSet
            }
          }
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockCacheSet).toHaveBeenCalledExactlyOnceWith('mock-session-id', {
        idToken: mockIdToken,
        linkedOrganisationId: organisationId
      })
      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith(
        `/organisations/${organisationId}`
      )
      expect(result).toBe('redirect-response')
    })

    it('should redirect to /login when user is not authenticated', async () => {
      const mockRequest = {
        payload: {
          organisationId: 'org-123'
        },
        pre: {
          authedUser: null
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-to-login')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/login')
      expect(result).toBe('redirect-to-login')
    })

    it('should redirect to /login when session has no value', async () => {
      const mockRequest = {
        payload: {
          organisationId: 'org-123'
        },
        pre: {
          authedUser: null
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-to-login')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/login')
      expect(result).toBe('redirect-to-login')
    })
  })

  describe('when validation fails', () => {
    it('should render error view with error messages', async () => {
      const mockOrganisations = {
        current: {
          id: 'defra-org-123',
          name: 'My Defra Organisation'
        },
        linked: null,
        unlinked: [
          {
            id: 'org-1',
            name: 'Test Company Ltd',
            orgId: '12345678'
          }
        ]
      }

      mockBackendServer.use(
        http.get(`${backendUrl}/v1/me/organisations`, () => {
          return HttpResponse.json({ organisations: mockOrganisations })
        })
      )

      const mockSession = {
        idToken: 'mock-id-token'
      }

      const mockRequest = {
        payload: {},
        pre: {
          authedUser: mockSession
        },
        t: vi.fn((key) => {
          const translations = {
            'account:linking:pageTitle': 'Link Organisation',
            'account:linking:errorNoSelection': 'Select an organisation to link'
          }
          return translations[key] || key
        })
      }

      const mockView = {
        takeover: vi.fn().mockReturnValue('view-with-errors')
      }

      const mockH = {
        view: vi.fn().mockReturnValue(mockView)
      }

      const result = await controller.options.validate.failAction(
        mockRequest,
        mockH
      )

      expect(mockH.view).toHaveBeenCalledWith(
        'account/linking/index',
        expect.objectContaining({
          pageTitle: 'Link Organisation',
          unlinked: [
            {
              id: 'org-1',
              displayName: 'Test Company Ltd (ID: 12345678)',
              name: 'Test Company Ltd'
            }
          ],
          organisationName: 'My Defra Organisation',
          errors: {
            organisationId: {
              text: 'Select an organisation to link'
            }
          },
          errorSummary: [
            {
              text: 'Select an organisation to link',
              href: '#organisationId'
            }
          ]
        })
      )

      expect(mockView.takeover).toHaveBeenCalledTimes(1)
      expect(result).toBe('view-with-errors')
    })

    it('should redirect to login when user is not authenticated', async () => {
      const mockRequest = {
        payload: {},
        pre: {
          authedUser: null
        }
      }

      const mockRedirect = {
        takeover: vi.fn().mockReturnValue('redirect-to-login')
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue(mockRedirect)
      }

      const result = await controller.options.validate.failAction(
        mockRequest,
        mockH
      )

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/login')
      expect(mockRedirect.takeover).toHaveBeenCalledTimes(1)
      expect(result).toBe('redirect-to-login')
    })

    it('should redirect to login when session has no authedUser', async () => {
      const mockRequest = {
        payload: {},
        pre: {
          authedUser: null
        }
      }

      const mockRedirect = {
        takeover: vi.fn().mockReturnValue('redirect-to-login')
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue(mockRedirect)
      }

      const result = await controller.options.validate.failAction(
        mockRequest,
        mockH
      )

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/login')
      expect(mockRedirect.takeover).toHaveBeenCalledTimes(1)
      expect(result).toBe('redirect-to-login')
    })
  })
})
