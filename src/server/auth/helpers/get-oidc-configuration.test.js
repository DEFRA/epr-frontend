import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { getOidcConfiguration } from './get-oidc-configuration.js'

const oidcUrl = 'http://oidc.test/.well-known/openid-configuration'

const mockOidcConfig = {
  issuer: 'http://oidc.test',
  authorization_endpoint: 'http://oidc.test/authorize',
  token_endpoint: 'http://oidc.test/token',
  end_session_endpoint: 'http://oidc.test/logout',
  jwks_uri: 'http://oidc.test/.well-known/jwks.json'
}

describe('#getOidcConfiguration', () => {
  beforeEach(({ msw }) => {
    msw.use(http.get(oidcUrl, () => HttpResponse.json(mockOidcConfig)))
  })

  it('should return parsed OIDC configuration', async () => {
    const result = await getOidcConfiguration(oidcUrl)

    expect(result).toStrictEqual(mockOidcConfig)
  })

  it('should throw when response status is 404', async ({ msw }) => {
    msw.use(http.get(oidcUrl, () => new HttpResponse(null, { status: 404 })))

    await expect(getOidcConfiguration(oidcUrl)).rejects.toThrow(
      'Response Error: 404'
    )
  })

  it('should throw when response status is 500', async ({ msw }) => {
    msw.use(http.get(oidcUrl, () => new HttpResponse(null, { status: 500 })))

    await expect(getOidcConfiguration(oidcUrl)).rejects.toThrow(
      'Response Error: 500'
    )
  })

  it('should throw when network request fails', async ({ msw }) => {
    msw.use(http.get(oidcUrl, () => HttpResponse.error()))

    await expect(getOidcConfiguration(oidcUrl)).rejects.toThrow(
      'Client request error'
    )
  })
})
