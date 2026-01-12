import { config } from '#config/config.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { refreshIdToken } from '#server/auth/helpers/refresh-token.js'
import fetch from 'node-fetch'
import { describe, expect, test, vi } from 'vitest'

vi.mock(import('node-fetch'))
vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(import('#config/config.js'))

describe('refresh token', () => {
  test('should refresh id token with correct parameters', async () => {
    const mockAuthedUser = {
      refreshToken: 'refresh-token-123',
      urls: { token: 'http://localhost:3200/token' }
    }

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: mockAuthedUser
    })

    const mockConfig = {
      get: vi.fn((key) => {
        const values = {
          'defraId.clientId': 'client-id-123',
          'defraId.clientSecret': 'client-secret-456',
          'defraId.serviceId': 'service-id-789'
        }
        return values[key]
      })
    }

    vi.mocked(config).get = mockConfig.get

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        id_token: 'new-access-token',
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

    const result = await refreshIdToken(mockRequest)

    expect(getUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)

    expect(mockRequest.logger.info).toHaveBeenCalledExactlyOnceWith(
      'ID token expired, refreshing...'
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
      scope: 'openid offline_access',
      serviceId: 'service-id-789'
    })

    expect(result).toStrictEqual(mockResponse)
  })

  test('should throw error when refresh token is null', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: {
        refreshToken: null,
        urls: { token: 'http://localhost:3200/token' }
      }
    })

    const mockRequest = { logger: { info: vi.fn() } }

    await expect(refreshIdToken(mockRequest)).rejects.toThrowError(
      'Cannot refresh token: no refresh token found'
    )

    expect(fetch).not.toHaveBeenCalled()
  })

  test('should throw error when refresh token is missing', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: {
        urls: { token: 'http://localhost:3200/token' }
      }
    })

    const mockRequest = { logger: { info: vi.fn() } }

    await expect(refreshIdToken(mockRequest)).rejects.toThrowError(
      'Cannot refresh token: no refresh token found'
    )

    expect(fetch).not.toHaveBeenCalled()
  })

  test('should throw error when getUserSession returns no session', async () => {
    vi.mocked(getUserSession).mockResolvedValue({ ok: false })

    const mockRequest = {
      logger: {
        info: vi.fn()
      }
    }

    await expect(refreshIdToken(mockRequest)).rejects.toThrowError(
      'Cannot refresh token: no user session found'
    )

    expect(mockRequest.logger.info).not.toHaveBeenCalled()
  })
})
