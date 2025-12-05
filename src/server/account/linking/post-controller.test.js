import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { describe, expect, it, vi } from 'vitest'
import { controller } from './post-controller.js'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe('account linking POST controller', () => {
  describe('when validation passes', () => {
    it('should redirect to /account', async () => {
      const mockRequest = {
        payload: {
          organisationId: 'org-123'
        }
      }

      const mockH = {
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = await controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledExactlyOnceWith('/account')
      expect(result).toBe('redirect-response')
    })
  })

  describe('when validation fails', () => {
    it('should render error view with error messages', async () => {
      const mockAuthedUser = {
        displayName: 'Test User',
        organisations: {
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

      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: mockAuthedUser
      })

      const mockRequest = {
        payload: {},
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

      expect(
        getUserSessionModule.getUserSession
      ).toHaveBeenCalledExactlyOnceWith(mockRequest)

      expect(mockH.view).toHaveBeenCalledWith('account/linking/index', {
        pageTitle: 'Link Organisation',
        session: mockAuthedUser,
        unlinked: [
          {
            id: 'org-1',
            companyDetails: {
              tradingName: 'Test Company'
            }
          }
        ],
        organisationName: '[PLACEHOLDER] Gaskells Waste Services',
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

      expect(mockView.takeover).toHaveBeenCalledTimes(1)
      expect(result).toBe('view-with-errors')
    })

    it('should redirect to login when user is not authenticated', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const mockRequest = {
        payload: {}
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
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: null
      })

      const mockRequest = {
        payload: {}
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
