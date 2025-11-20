import { config } from '#config/config.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { refreshAccessToken } from '#server/auth/helpers/refresh-token.js'
import fetch from 'node-fetch'
import { describe, expect, test, vi } from 'vitest'

vi.mock(import('node-fetch'))
vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(import('#config/config.js'))

describe('#refreshAccessToken', () => {
  test('should refresh access token with correct parameters', async () => {
    const mockAuthedUser = {
      refreshToken: 'refresh-token-123',
      tokenUrl: 'http://localhost:3200/token'
    }

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: mockAuthedUser
    })

    const mockConfig = {
      get: vi.fn((key) => {
        const values = {
          'defraId.clientId': 'client-id-123',
          'defraId.clientSecret': 'client-secret-456'
        }
        return values[key]
      })
    }

    vi.mocked(config).get = mockConfig.get

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      })
    }

    vi.mocked(fetch).mockResolvedValue(mockResponse)

    const mockRequest = {
      logger: {
        info: vi.fn()
      }
    }

    const result = await refreshAccessToken(mockRequest)

    expect(getUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)

    expect(mockRequest.logger.info).toHaveBeenCalledExactlyOnceWith(
      'Access token expired, refreshing...'
    )

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:3200/token',
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        },
        body: expect.any(URLSearchParams)
      }
    )

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const params = fetchCall[1].body

    expect(Object.fromEntries(params)).toStrictEqual({
      client_id: 'client-id-123',
      client_secret: 'client-secret-456',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-token-123',
      scope: 'client-id-123 openid profile email offline_access'
    })

    expect(result).toStrictEqual(mockResponse)
  })

  test('should handle null refresh token', async () => {
    const mockAuthedUser = {
      refreshToken: null,
      tokenUrl: 'http://localhost:3200/token'
    }

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: mockAuthedUser
    })

    const mockConfig = {
      get: vi.fn((key) => {
        const values = {
          'defraId.clientId': 'client-id-123',
          'defraId.clientSecret': 'client-secret-456'
        }
        return values[key]
      })
    }

    vi.mocked(config).get = mockConfig.get

    const mockResponse = {
      ok: false
    }

    vi.mocked(fetch).mockResolvedValue(mockResponse)

    const mockRequest = {
      logger: {
        info: vi.fn()
      }
    }

    await refreshAccessToken(mockRequest)

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const params = fetchCall[1].body

    expect(params.get('refresh_token')).toBe('null')
  })

  test('should handle missing refresh token in authedUser', async () => {
    const mockAuthedUser = {
      tokenUrl: 'http://localhost:3200/token'
    }

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: mockAuthedUser
    })

    const mockConfig = {
      get: vi.fn((key) => {
        const values = {
          'defraId.clientId': 'client-id-123',
          'defraId.clientSecret': 'client-secret-456'
        }
        return values[key]
      })
    }

    vi.mocked(config).get = mockConfig.get

    const mockResponse = {
      ok: false
    }

    vi.mocked(fetch).mockResolvedValue(mockResponse)

    const mockRequest = {
      logger: {
        info: vi.fn()
      }
    }

    await refreshAccessToken(mockRequest)

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const params = fetchCall[1].body

    expect(params.get('refresh_token')).toBe('null')
  })

  test('should throw error when getUserSession returns no session', async () => {
    vi.mocked(getUserSession).mockResolvedValue({ ok: false })

    const mockRequest = {
      logger: {
        info: vi.fn()
      }
    }

    await expect(refreshAccessToken(mockRequest)).rejects.toThrow(
      'Cannot refresh token: no user session found'
    )

    expect(mockRequest.logger.info).not.toHaveBeenCalled()
  })
})
