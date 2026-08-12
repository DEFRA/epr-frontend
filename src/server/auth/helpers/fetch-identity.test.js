import { config } from '#config/config.js'
import { bearerAuthHandler } from '#server/common/test-helpers/bearer-auth-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { fetchIdentity } from './fetch-identity.js'

describe('#fetchIdentity', () => {
  const backendUrl = config.get('eprBackendUrl')
  const mockBackendToken = 'mock-backend-token-12345'

  /**
   * @param {{ role?: string | null, scopes?: unknown[] }} body
   */
  const identityResponse = (body) =>
    bearerAuthHandler('get', `${backendUrl}/v1/me`, mockBackendToken, () =>
      HttpResponse.json(body)
    )

  beforeEach(({ msw }) => {
    msw.use(
      identityResponse({
        role: 'operator',
        scopes: ['organisation.linked.read', 'organisation.linked.write']
      })
    )
  })

  it('should return the role and scopes the backend resolved', async () => {
    const result = await fetchIdentity(mockBackendToken)

    expect(result).toStrictEqual({
      role: 'operator',
      scopes: ['organisation.linked.read', 'organisation.linked.write']
    })
  })

  it('should return a regulator identity without a write scope', async ({
    msw
  }) => {
    msw.use(
      identityResponse({
        role: 'regulator_standard',
        scopes: ['organisation.read', 'regulator']
      })
    )

    const result = await fetchIdentity(mockBackendToken)

    expect(result).toStrictEqual({
      role: 'regulator_standard',
      scopes: ['organisation.read', 'regulator']
    })
  })

  it('should return no role and no scopes for an identity the backend does not recognise', async ({
    msw
  }) => {
    msw.use(identityResponse({ role: null, scopes: [] }))

    const result = await fetchIdentity(mockBackendToken)

    expect(result).toStrictEqual({ role: null, scopes: [] })
  })

  it('should reject a response that omits the scopes', async ({ msw }) => {
    msw.use(identityResponse({ role: 'operator' }))

    await expect(fetchIdentity(mockBackendToken)).rejects.toThrow(
      /Invalid identity/
    )
  })

  it('should reject a response whose scopes are not strings', async ({
    msw
  }) => {
    msw.use(identityResponse({ role: 'operator', scopes: [{}] }))

    await expect(fetchIdentity(mockBackendToken)).rejects.toThrow(
      /Invalid identity/
    )
  })

  it('should throw when the backend refuses the token', async () => {
    await expect(fetchIdentity('invalid-token')).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 401
      }
    })
  })

  it('should throw when the backend fails', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/v1/me`, () =>
        HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      )
    )

    await expect(fetchIdentity(mockBackendToken)).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })
})
