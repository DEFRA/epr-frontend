import { config } from '#config/config.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { refreshIdToken } from '#server/auth/helpers/refresh-token.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(import('#config/config.js'))
vi.mock(import('@defra/hapi-tracing'), () => ({
  withTraceId: vi.fn((headerName, headers = {}) => headers),
  tracing: { plugin: {} }
}))

describe('refresh token', () => {
  it('should refresh id token with correct parameters', async ({ msw }) => {
    let capturedRequest
    msw.use(
      http.post('http://defra-id.auth/token', async ({ request }) => {
        capturedRequest = request.clone()
        return HttpResponse.json({
          id_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        })
      })
    )

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: {
        refreshToken: 'refresh-token-123',
        urls: { token: 'http://defra-id.auth/token' }
      }
    })

    vi.spyOn(vi.mocked(config), 'get').mockImplementation((key) => {
      const values = {
        'defraId.clientId': 'client-id-123',
        'defraId.clientSecret': 'client-secret-456',
        'defraId.serviceId': 'service-id-789'
      }
      return values[key]
    })

    const mockRequest = { logger: { info: vi.fn() } }

    await refreshIdToken(mockRequest)

    expect(getUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
    expect(mockRequest.logger.info).toHaveBeenCalledExactlyOnceWith(
      {
        event: {
          action: 'token-refresh-oidc-call',
          outcome: 'success',
          kind: 'event'
        },
        http: { response: { status_code: 200 } }
      },
      'OIDC token endpoint call complete'
    )

    const params = new URLSearchParams(await capturedRequest.text())
    expect(Object.fromEntries(params)).toStrictEqual({
      client_id: 'client-id-123',
      client_secret: 'client-secret-456',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-token-123',
      scope: 'openid offline_access',
      serviceId: 'service-id-789'
    })
  })

  it('should throw error when refresh token is null', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: {
        refreshToken: null,
        urls: { token: 'http://defra-id.auth/token' }
      }
    })

    await expect(
      refreshIdToken({ logger: { info: vi.fn() } })
    ).rejects.toThrowError('Cannot refresh token: no refresh token found')
  })

  it('should throw error when refresh token is missing', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: { urls: { token: 'http://defra-id.auth/token' } }
    })

    await expect(
      refreshIdToken({ logger: { info: vi.fn() } })
    ).rejects.toThrowError('Cannot refresh token: no refresh token found')
  })

  it('should throw error when getUserSession returns no session', async () => {
    vi.mocked(getUserSession).mockResolvedValue({ ok: false })

    const mockRequest = { logger: { info: vi.fn() } }

    await expect(refreshIdToken(mockRequest)).rejects.toThrowError(
      'Cannot refresh token: no user session found'
    )

    expect(mockRequest.logger.info).not.toHaveBeenCalled()
  })
})
