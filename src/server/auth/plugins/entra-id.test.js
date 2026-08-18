import { getOidcConfiguration } from '#server/auth/helpers/get-oidc-configuration.js'
import { createEntraIdAuthProvider } from '#server/auth/plugins/entra-id.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { createPrivateKey, generateKeyPairSync } from 'node:crypto'
import { describe, expect } from 'vitest'

/**
 * @import { ProviderTokens } from '#server/auth/types/auth-provider.js'
 */

const oidcConf = {
  issuer: 'http://entra-id.auth',
  authorization_endpoint: 'http://entra-id.auth/authorize',
  token_endpoint: 'http://entra-id.auth/token',
  end_session_endpoint: 'http://entra-id.auth/logout',
  jwks_uri: 'http://entra-id.auth/.well-known/jwks.json'
}

const { privateKey: privateKeyObject, publicKey: publicKeyObject } =
  generateKeyPairSync('rsa', { modulusLength: 2048 })

const publicKey = publicKeyObject.export({ format: 'jwk' })
const privateKeyPem = createPrivateKey(
  privateKeyObject.export({ type: 'pkcs8', format: 'pem' })
)

const expiresInAnHour = Math.floor(Date.now() / 1000) + 3600

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<string>}
 */
const signAccessToken = (payload) =>
  new jose.SignJWT({ exp: expiresInAnHour, ...payload })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .sign(privateKeyPem)

const entraClaims = {
  oid: 'entra-user-id',
  preferred_username: 'jane.doe@example.com',
  aud: 'test-entra-client-id',
  iss: oidcConf.issuer
}

/**
 * @param {ProviderTokens} tokens
 * @returns {ProviderTokens}
 */
const tokenResponse = (tokens) => tokens

describe(createEntraIdAuthProvider, () => {
  beforeEach(({ msw }) => {
    msw.use(
      http.get(oidcConf.jwks_uri, () =>
        HttpResponse.json({ keys: [{ ...publicKey, kid: 'test-key-id' }] })
      )
    )
  })

  describe('the parameters on a refresh request', () => {
    it('asks Entra ID with its own client credentials', () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      expect(authProvider.tokenRequestParams).toMatchObject({
        client_id: 'test-entra-client-id',
        client_secret: 'test-entra-secret'
      })
    })

    it('asks for the resource scope that carries the roles claim', () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      expect(authProvider.tokenRequestParams.scope).toBe(
        'openid profile email offline_access api://test-entra-client-id/.default'
      )
    })

    it('sends no serviceId, which belongs to Defra ID alone', () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      expect(authProvider.tokenRequestParams).not.toHaveProperty('serviceId')
    })
  })

  describe('the token presented to the backend', () => {
    it('is the access token, which carries the roles claim', () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      expect(
        authProvider.selectBackendToken(
          tokenResponse({
            id_token: 'an-id-token',
            access_token: 'an-access-token'
          })
        )
      ).toBe('an-access-token')
    })

    it('is refused when Entra ID returns no access token', () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      expect(() =>
        authProvider.selectBackendToken(
          tokenResponse({ id_token: 'an-id-token' })
        )
      ).toThrow('Entra ID returned no access token')
    })
  })

  describe('the identity read from a verified access token', () => {
    it('takes the profile from the Entra ID claims', async () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      const { profile } = await authProvider.verifyBackendToken(
        await signAccessToken(entraClaims)
      )

      expect(profile).toStrictEqual({
        id: 'entra-user-id',
        email: 'jane.doe@example.com'
      })
    })

    it('takes the expiry from the access token, not from the id token', async () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      const { expiresAt } = await authProvider.verifyBackendToken(
        await signAccessToken(entraClaims)
      )

      expect(expiresAt).toBe(new Date(expiresInAnHour * 1000).toISOString())
    })

    it('refuses a token issued for another audience', async () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      await expect(
        authProvider.verifyBackendToken(
          await signAccessToken({ ...entraClaims, aud: 'another-app' })
        )
      ).rejects.toThrow('unexpected "aud" claim value')
    })

    it('refuses a token issued by someone other than the provider the discovery document names', async () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      await expect(
        authProvider.verifyBackendToken(
          await signAccessToken({
            ...entraClaims,
            iss: 'https://login.microsoftonline.com/another-tenant/v2.0'
          })
        )
      ).rejects.toThrow('unexpected "iss" claim value')
    })

    it('refuses a discovery document that names no issuer, rather than check no issuer at all', async ({
      msw
    }) => {
      const wellKnownUrl =
        'http://entra-id.auth/.well-known/openid-configuration'
      const { issuer: _issuer, ...withoutIssuer } = oidcConf
      msw.use(http.get(wellKnownUrl, () => HttpResponse.json(withoutIssuer)))

      await expect(
        getOidcConfiguration(wellKnownUrl).then(createEntraIdAuthProvider)
      ).rejects.toThrow('Entra ID discovery document names no issuer')
    })

    it('follows the discovery document to a different provider', async () => {
      const authProvider = createEntraIdAuthProvider({
        ...oidcConf,
        issuer: 'http://another-entra-id.auth'
      })

      const { profile } = await authProvider.verifyBackendToken(
        await signAccessToken({
          ...entraClaims,
          iss: 'http://another-entra-id.auth'
        })
      )

      expect(profile.id).toBe('entra-user-id')
    })
  })
})
