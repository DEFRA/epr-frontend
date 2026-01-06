import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe('#signOutController', () => {
  /** @type {Server} */
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  beforeAll(async () => {
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

  afterAll(async () => {
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

  describe('when user navigates directly to /sign-out', () => {
    it('should redirect to home when signedOut flash is not set', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/sign-out'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/')
    })
  })

  describe('when user arrives via proper logout flow', () => {
    it('should render sign-out page with correct content', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      // Since we can't easily set flash externally via server.inject,
      // we test the controller directly with mocked yar
      const { controller } = await import('./controller.js')

      const mockRequest = {
        t: (key) => {
          const translations = {
            'sign-out:pageTitle': 'Signed out'
          }
          return translations[key] || key
        },
        localiseUrl: (path) => path,
        yar: {
          flash: vi.fn().mockReturnValue([true])
        }
      }

      const mockH = {
        view: vi.fn().mockReturnValue('view-response'),
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = controller.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('sign-out/index', {
        pageTitle: 'Signed out'
      })
      expect(result).toBe('view-response')
    })
  })

  describe('when signedOut flash is empty array', () => {
    it('should redirect to home', async () => {
      const { controller } = await import('./controller.js')

      const mockRequest = {
        t: (key) => key,
        localiseUrl: (path) => path,
        yar: {
          flash: vi.fn().mockReturnValue([])
        }
      }

      const mockH = {
        view: vi.fn().mockReturnValue('view-response'),
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/')
      expect(result).toBe('redirect-response')
    })
  })

  describe('when signedOut flash is undefined', () => {
    it('should redirect to home', async () => {
      const { controller } = await import('./controller.js')

      const mockRequest = {
        t: (key) => key,
        localiseUrl: (path) => path,
        yar: {
          flash: vi.fn().mockReturnValue(undefined)
        }
      }

      const mockH = {
        view: vi.fn().mockReturnValue('view-response'),
        redirect: vi.fn().mockReturnValue('redirect-response')
      }

      const result = controller.handler(mockRequest, mockH)

      expect(mockH.redirect).toHaveBeenCalledWith('/')
      expect(result).toBe('redirect-response')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
