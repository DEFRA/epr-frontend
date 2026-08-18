import { createEntraIdAuthProvider } from '#server/auth/plugins/entra-id.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { createPrivateKey, generateKeyPairSync } from 'node:crypto'
import { describe, expect } from 'vitest'

/**
 * @import { RefreshedTokens } from '#server/auth/helpers/refreshed-tokens-schema.js'
 */

const oidcConf = {
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
  iss: 'https://login.microsoftonline.com/test-tenant-id/v2.0'
}

/**
 * @param {Partial<RefreshedTokens>} tokens
 * @returns {RefreshedTokens}
 */
const asRefreshedTokens = (tokens) =>
  /** @type {RefreshedTokens} */ (/** @type {unknown} */ (tokens))

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
          asRefreshedTokens({
            id_token: 'an-id-token',
            access_token: 'an-access-token',
            refresh_token: 'a-refresh-token'
          })
        )
      ).toBe('an-access-token')
    })

    it('fails the refresh when Entra ID returns no access token', () => {
      const authProvider = createEntraIdAuthProvider(oidcConf)

      expect(() =>
        authProvider.selectBackendToken(
          asRefreshedTokens({
            id_token: 'an-id-token',
            refresh_token: 'a-refresh-token'
          })
        )
      ).toThrow('Entra ID refresh returned no access token')
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

    it('refuses a token issued by another tenant', async () => {
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
  })
})
