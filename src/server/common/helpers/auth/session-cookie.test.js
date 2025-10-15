import { addMinutes } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessionCookie } from '~/src/server/common/helpers/auth/session-cookie.js'

vi.mock(import('@hapi/cookie'), () => ({
  default: {
    name: 'cookie',
    register: vi.fn()
  }
}))

vi.mock(import('date-fns'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    isPast: vi.fn(),
    parseISO: vi.fn(),
    subMinutes: vi.fn()
  }
})

vi.mock(import('~/src/config/config.js'), () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock(import('~/src/server/common/helpers/auth/get-user-session.js'), () => ({
  getUserSession: vi.fn()
}))

vi.mock(import('~/src/server/common/helpers/auth/refresh-token.js'), () => ({
  refreshAccessToken: vi.fn()
}))

vi.mock(import('~/src/server/common/helpers/auth/user-session.js'), () => ({
  removeUserSession: vi.fn(),
  updateUserSession: vi.fn()
}))

describe('#sessionCookie', () => {
  let mockServer
  let mockAuthCookie
  let mockConfig
  let mockGetUserSession
  let mockRefreshAccessToken
  let mockRemoveUserSession
  let mockUpdateUserSession
  let mockIsPast
  let mockParseISO
  let mockSubMinutes

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import mocked modules
    const authCookie = await import('@hapi/cookie')
    mockAuthCookie = authCookie.default

    const { config } = await import('~/src/config/config.js')
    mockConfig = config

    const { getUserSession } = await import(
      '~/src/server/common/helpers/auth/get-user-session.js'
    )
    mockGetUserSession = getUserSession

    const { refreshAccessToken } = await import(
      '~/src/server/common/helpers/auth/refresh-token.js'
    )
    mockRefreshAccessToken = refreshAccessToken

    const { removeUserSession, updateUserSession } = await import(
      '~/src/server/common/helpers/auth/user-session.js'
    )
    mockRemoveUserSession = removeUserSession
    mockUpdateUserSession = updateUserSession

    const dateFns = await import('date-fns')
    mockIsPast = dateFns.isPast
    mockParseISO = dateFns.parseISO
    mockSubMinutes = dateFns.subMinutes

    // Setup default mock implementations
    mockConfig.get.mockImplementation((key) => {
      const configMap = {
        'session.cookie.password': 'test-password-at-least-32-characters-long',
        'session.cookie.secure': true,
        'session.cookie.ttl': 3600000 // 1 hour
      }
      return configMap[key]
    })

    mockServer = {
      register: vi.fn().mockResolvedValue(undefined),
      auth: {
        strategy: vi.fn(),
        default: vi.fn()
      },
      app: {
        cache: {
          get: vi.fn()
        }
      }
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('plugin metadata', () => {
    it('should have correct plugin name', () => {
      expect(sessionCookie.plugin.name).toBe('user-session')
    })
  })

  describe('plugin registration', () => {
    it('should register cookie auth plugin', async () => {
      await sessionCookie.plugin.register(mockServer)

      expect(mockServer.register).toHaveBeenCalledWith(mockAuthCookie)
    })

    it('should configure session strategy with correct cookie settings', async () => {
      await sessionCookie.plugin.register(mockServer)

      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'session',
        'cookie',
        expect.objectContaining({
          cookie: {
            name: 'userSession',
            path: '/',
            password: 'test-password-at-least-32-characters-long',
            isSecure: true,
            ttl: 3600000
          },
          keepAlive: true
        })
      )
    })

    it('should set session as default auth strategy', async () => {
      await sessionCookie.plugin.register(mockServer)

      expect(mockServer.auth.default).toHaveBeenCalledWith('session')
    })
  })

  describe('validate function', () => {
    let validateFn

    beforeEach(async () => {
      await sessionCookie.plugin.register(mockServer)

      const strategyCall = mockServer.auth.strategy.mock.calls[0]
      const config = strategyCall[2]
      validateFn = config.validate
    })

    describe('when token is not expired', () => {
      it('should return valid session from cache', async () => {
        const futureDate = addMinutes(new Date(), 10).toISOString()
        const mockUserSession = {
          id: 'user-123',
          email: 'test@example.com',
          expiresAt: futureDate
        }

        mockGetUserSession.mockResolvedValue({
          expiresAt: futureDate
        })

        const parsedDate = new Date(futureDate)
        mockParseISO.mockReturnValue(parsedDate)

        const oneMinuteBefore = addMinutes(parsedDate, -1)
        mockSubMinutes.mockReturnValue(oneMinuteBefore)

        // Token is NOT expired
        mockIsPast.mockReturnValue(false)

        mockServer.app.cache.get.mockResolvedValue(mockUserSession)

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        const result = await validateFn(mockRequest, mockSession)

        expect(mockGetUserSession).toHaveBeenCalledWith(mockRequest)
        expect(mockIsPast).toHaveBeenCalledWith(oneMinuteBefore)
        expect(mockServer.app.cache.get).toHaveBeenCalledWith('session-123')
        expect(result).toStrictEqual({
          isValid: true,
          credentials: mockUserSession
        })
      })

      it('should return invalid when session not found in cache', async () => {
        const futureDate = addMinutes(new Date(), 10).toISOString()

        mockGetUserSession.mockResolvedValue({
          expiresAt: futureDate
        })

        const parsedDate = new Date(futureDate)
        mockParseISO.mockReturnValue(parsedDate)
        mockSubMinutes.mockReturnValue(addMinutes(parsedDate, -1))
        mockIsPast.mockReturnValue(false)

        // Session not in cache
        mockServer.app.cache.get.mockResolvedValue(null)

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        const result = await validateFn(mockRequest, mockSession)

        expect(mockServer.app.cache.get).toHaveBeenCalledWith('session-123')
        expect(result).toStrictEqual({
          isValid: false
        })
      })
    })

    describe('when token is expired', () => {
      it('should refresh token and return updated session when refresh succeeds', async () => {
        const expiredDate = addMinutes(new Date(), -5).toISOString()

        mockGetUserSession.mockResolvedValue({
          expiresAt: expiredDate
        })

        const parsedDate = new Date(expiredDate)
        mockParseISO.mockReturnValue(parsedDate)
        mockSubMinutes.mockReturnValue(addMinutes(parsedDate, -1))

        // Token IS expired
        mockIsPast.mockReturnValue(true)

        const mockRefreshResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          })
        }

        mockRefreshAccessToken.mockResolvedValue(mockRefreshResponse)

        const oneMinuteBefore = addMinutes(parsedDate, -1)
        mockSubMinutes.mockReturnValue(oneMinuteBefore)

        const mockUpdatedSession = {
          id: 'user-123',
          email: 'test@example.com',
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: addMinutes(new Date(), 60).toISOString()
        }

        mockUpdateUserSession.mockResolvedValue(mockUpdatedSession)

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        const result = await validateFn(mockRequest, mockSession)

        expect(mockGetUserSession).toHaveBeenCalledWith(mockRequest)
        expect(mockIsPast).toHaveBeenCalledWith(oneMinuteBefore)
        expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockRequest)
        expect(mockUpdateUserSession).toHaveBeenCalledWith(mockRequest, {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        })
        expect(result).toStrictEqual({
          isValid: true,
          credentials: mockUpdatedSession
        })
      })

      it('should remove session and return invalid when refresh fails', async () => {
        const expiredDate = addMinutes(new Date(), -5).toISOString()

        mockGetUserSession.mockResolvedValue({
          expiresAt: expiredDate
        })

        const parsedDate = new Date(expiredDate)
        mockParseISO.mockReturnValue(parsedDate)

        const oneMinuteBefore = addMinutes(parsedDate, -1)
        mockSubMinutes.mockReturnValue(oneMinuteBefore)

        // Token IS expired
        mockIsPast.mockReturnValue(true)

        const mockRefreshResponse = {
          ok: false,
          json: vi.fn().mockResolvedValue({
            error: 'invalid_grant'
          })
        }

        mockRefreshAccessToken.mockResolvedValue(mockRefreshResponse)
        mockRemoveUserSession.mockResolvedValue(undefined)

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        const result = await validateFn(mockRequest, mockSession)

        expect(mockGetUserSession).toHaveBeenCalledWith(mockRequest)
        expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockRequest)
        expect(mockRemoveUserSession).toHaveBeenCalledWith(mockRequest)
        expect(mockUpdateUserSession).not.toHaveBeenCalled()
        expect(result).toStrictEqual({
          isValid: false
        })
      })

      it('should handle token expiring in less than 1 minute', async () => {
        // Token expires in 30 seconds
        const soonToExpireDate = addMinutes(new Date(), 0.5).toISOString()

        mockGetUserSession.mockResolvedValue({
          expiresAt: soonToExpireDate
        })

        const parsedDate = new Date(soonToExpireDate)
        mockParseISO.mockReturnValue(parsedDate)

        const oneMinuteBefore = addMinutes(parsedDate, -1)
        mockSubMinutes.mockReturnValue(oneMinuteBefore)

        // Token is considered expired (less than 1 minute remaining)
        mockIsPast.mockReturnValue(true)

        const mockRefreshResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            expires_in: 3600
          })
        }

        mockRefreshAccessToken.mockResolvedValue(mockRefreshResponse)
        mockUpdateUserSession.mockResolvedValue({
          id: 'user-123',
          token: 'new-token'
        })

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        const result = await validateFn(mockRequest, mockSession)

        expect(mockIsPast).toHaveBeenCalledWith(oneMinuteBefore)
        expect(mockRefreshAccessToken).toHaveBeenCalledWith(mockRequest)
        expect(result.isValid).toBe(true)
      })
    })

    describe('date handling', () => {
      it('should correctly parse ISO date string', async () => {
        const futureDate = '2025-12-31T23:59:59.000Z'

        mockGetUserSession.mockResolvedValue({
          expiresAt: futureDate
        })

        const parsedDate = new Date(futureDate)
        mockParseISO.mockReturnValue(parsedDate)
        mockSubMinutes.mockReturnValue(addMinutes(parsedDate, -1))
        mockIsPast.mockReturnValue(false)
        mockServer.app.cache.get.mockResolvedValue({ id: 'user-123' })

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        await validateFn(mockRequest, mockSession)

        expect(mockParseISO).toHaveBeenCalledWith(futureDate)
      })

      it('should subtract 1 minute from expiry time for comparison', async () => {
        const futureDate = '2025-12-31T23:59:59.000Z'

        mockGetUserSession.mockResolvedValue({
          expiresAt: futureDate
        })

        const parsedDate = new Date(futureDate)
        mockParseISO.mockReturnValue(parsedDate)
        mockSubMinutes.mockReturnValue(addMinutes(parsedDate, -1))
        mockIsPast.mockReturnValue(false)
        mockServer.app.cache.get.mockResolvedValue({ id: 'user-123' })

        const mockRequest = {}
        const mockSession = { sessionId: 'session-123' }

        await validateFn(mockRequest, mockSession)

        expect(mockSubMinutes).toHaveBeenCalledWith(parsedDate, 1)
      })
    })
  })
})
