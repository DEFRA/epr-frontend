import fetch from 'node-fetch'
import { describe, expect, test, vi } from 'vitest'

import { config } from '~/src/config/config.js'
import { getUserSession } from '~/src/server/common/helpers/auth/get-user-session.js'
import { refreshAccessToken } from '~/src/server/common/helpers/auth/refresh-token.js'

vi.mock(import('node-fetch'))
vi.mock(import('~/src/server/common/helpers/auth/get-user-session.js'))
vi.mock(import('~/src/config/config.js'))

describe('#refreshAccessToken', () => {
  test('should refresh access token with correct parameters', async () => {
    const mockAuthedUser = {
      refreshToken: 'refresh-token-123',
      tokenUrl: 'http://localhost:3200/token'
    }

    vi.mocked(getUserSession).mockResolvedValue(mockAuthedUser)

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

    vi.mocked(getUserSession).mockResolvedValue(mockAuthedUser)

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

    vi.mocked(getUserSession).mockResolvedValue(mockAuthedUser)

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
})
