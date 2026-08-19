import * as jose from 'jose'
import { config } from '#config/config.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  assertUserSession,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import {
  IDENTITIES,
  identityHandler
} from '#server/common/test-helpers/identity-helper.js'
import { ENTRA_ID_BASE_URL, beforeEach, it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'
import { createPrivateKey, generateKeyPairSync, randomUUID } from 'node:crypto'

const mock = {
  cdpAuditing: vi.fn(),
  signInSuccessMetric: vi.fn(),
  signInFailureMetric: vi.fn()
}

vi.mock(
  import('#server/common/helpers/metrics/index.js'),
  async (importOriginal) => ({
    metrics: {
      ...(await importOriginal()).metrics,
      signInFailure: (oidcProvider) => mock.signInFailureMetric(oidcProvider),
      signInSuccess: (oidcProvider) => mock.signInSuccessMetric(oidcProvider)
    }
  })
)

vi.mock(import('@defra/cdp-auditing'), () => ({
  audit: (...args) => mock.cdpAuditing(...args)
}))

const cookieHeaderFrom = (response) => {
  const rawCookies = response.headers['set-cookie']
  const cookieList = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies]
      : []

  return cookieList.map((header) => header.split(';')[0]).join('; ')
}

const performSignInFlow = async (server, mswServer, tokenInfo) => {
  const { accessToken, idToken, publicKey, referer, callbackReferer } =
    tokenInfo
  const signInResponse = await server.inject({
    method: 'GET',
    url: '/regulators/login',
    headers: referer ? { referer } : {}
  })
  const ssoUrl = new URL(signInResponse.headers['location'])

  mswServer.use(
    http.post('http://entra-id.auth/token', () =>
      HttpResponse.json({
        access_token: accessToken,
        id_token: idToken ?? accessToken
      })
    )
  )

  mswServer.use(
    http.get('http://entra-id.auth/.well-known/jwks.json', () => {
      return HttpResponse.json({
        keys: [{ ...publicKey, kid: 'test-key-id' }]
      })
    })
  )

  const stateParam = ssoUrl.searchParams.get('state')
  const code = randomUUID()
  return server.inject({
    method: 'GET',
    url: `/auth/callback/entra?state=${stateParam}&code=${code}&refresh=1`,
    headers: {
      cookie: cookieHeaderFrom(signInResponse),
      ...(callbackReferer ? { referer: callbackReferer } : {})
    }
  })
}

async function generateAccessToken(
  /** @type {Record<string, unknown>} */ payload
) {
  const { privateKey: privateKeyObject, publicKey: publicKeyObject } =
    generateKeyPairSync('rsa', { modulusLength: 4096 })

  const publicKey = publicKeyObject.export({ format: 'jwk' })
  const privateKeyPem = privateKeyObject.export({
    type: 'pkcs8',
    format: 'pem'
  })

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setExpirationTime('2h')
    .sign(createPrivateKey(privateKeyPem))

  return { accessToken: jwt, publicKey }
}

describe('/auth/callback/entra - GET integration', async () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  const claims = {
    oid: 'entra-user-id',
    preferred_username: 'jane.doe@example.com',
    aud: 'test-entra-client-id',
    iss: ENTRA_ID_BASE_URL
  }

  // The application role rides on the token and this app never reads it. The
  // backend resolves it and answers over the identity endpoint, so every test
  // below varies that answer rather than the claim.
  const regulatorToken = await generateAccessToken({
    ...claims,
    roles: ['Waste.Regulator.Standard']
  })

  beforeEach(({ msw }) => {
    msw.use(identityHandler(IDENTITIES.regulator))
  })

  describe('on successful return from Entra ID - authorised regulator', () => {
    it('redirects to the regulators home page', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, regulatorToken)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/regulators/home')
    })

    it('creates a session', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, regulatorToken)

      const setCookieHeaders = []
        .concat(response.headers['set-cookie'] ?? [])
        .join(';')

      expect(setCookieHeaders).toContain('userSession=')
    })

    it('records sign in success metric', async ({ server, msw }) => {
      await performSignInFlow(server, msw, regulatorToken)

      expect(mock.signInSuccessMetric).toHaveBeenCalledTimes(1)
      expect(mock.signInSuccessMetric).toHaveBeenCalledWith('entra-id')
    })

    it('audits a successful sign in attempt', async ({ server, msw }) => {
      await performSignInFlow(server, msw, regulatorToken)

      expect(mock.cdpAuditing).toHaveBeenCalledTimes(1)
      expect(mock.cdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
          action: 'sign-in'
        },
        context: {
          oidcProvider: 'entra-id'
        },
        user: {
          id: 'entra-user-id',
          email: 'jane.doe@example.com'
        }
      })
    })
  })

  describe('on successful return from Entra ID - the tokens the session keeps', () => {
    const storedSession = async (server, msw) => {
      const cacheSet = vi.spyOn(server.app.cache, 'set')

      await performSignInFlow(server, msw, {
        ...regulatorToken,
        idToken: 'entra-id-token'
      })

      return assertUserSession(cacheSet.mock.calls[0][1])
    }

    it('presents the access token to the backend, because it carries the roles claim', async ({
      server,
      msw
    }) => {
      const session = await storedSession(server, msw)

      expect(session.backendToken).toBe(regulatorToken.accessToken)
    })

    it('keeps the id token for the logout hint', async ({ server, msw }) => {
      const session = await storedSession(server, msw)

      expect(session.idToken).toBe('entra-id-token')
    })
  })

  describe('on successful return from Entra ID - the identity the session keeps', () => {
    const storedSession = async (server, msw) => {
      const cacheSet = vi.spyOn(server.app.cache, 'set')

      await performSignInFlow(server, msw, regulatorToken)

      return assertUserSession(cacheSet.mock.calls[0][1])
    }

    it('takes the role and scopes from the backend', async ({
      server,
      msw
    }) => {
      const session = await storedSession(server, msw)

      expect(session).toMatchObject(sessionIdentity(IDENTITIES.regulator))
    })
  })

  describe('on successful return from Entra ID - authorised regulator, with a referrer recorded', () => {
    it('redirects back to the referring page', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        referer: 'http://localhost:3000/some/prior/page'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/some/prior/page')
    })
  })

  describe('on successful return from Entra ID - authorised regulator, arriving from another site', () => {
    it('ignores the external referrer and lands on the regulators home page', async ({
      server,
      msw
    }) => {
      const response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        referer: 'https://www.gov.uk/some/guidance/page'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/regulators/home')
    })
  })

  describe('on successful return from Entra ID - authorised regulator, arriving back from Entra ID', () => {
    it('ignores the Entra ID referrer on the callback and lands on the regulators home page', async ({
      server,
      msw
    }) => {
      const response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        callbackReferer: 'http://entra-id.auth/'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/regulators/home')
    })

    it('still prefers the page the regulator started from', async ({
      server,
      msw
    }) => {
      const response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        referer: 'http://localhost:3000/some/prior/page',
        callbackReferer: 'http://entra-id.auth/'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/some/prior/page')
    })
  })

  describe('on successful return from Entra ID - authorised regulator, with a skipped referrer', () => {
    it.for([
      {
        referrer: '/start',
        description: 'start page'
      },
      {
        referrer: '/cy/start',
        description: 'Welsh start page'
      },
      {
        referrer: '/logged-out',
        description: 'logged-out page'
      },
      {
        referrer: '/cy/logged-out',
        description: 'Welsh logged-out page'
      },
      {
        referrer: '/auth/callback',
        description: 'Defra ID auth callback page'
      },
      {
        referrer: '/auth/callback/entra',
        description: 'Entra ID auth callback page'
      }
    ])(
      'redirects to the regulators home page rather than back to $description',
      async ({ referrer }, { server, msw }) => {
        const response = await performSignInFlow(server, msw, {
          ...regulatorToken,
          referer: `http://localhost:3000${referrer}`
        })

        expect(response.statusCode).toBe(statusCodes.found)
        expect(response.headers['location']).toBe('/regulators/home')
      }
    )
  })

  describe('on successful return from Entra ID - an identity the backend does not recognise', () => {
    beforeEach(({ msw }) => {
      msw.use(identityHandler(IDENTITIES.unrecognised))
    })

    it('refuses the sign in with the not-authorised page', async ({
      server,
      msw
    }) => {
      const response = await performSignInFlow(server, msw, regulatorToken)

      expect(response.statusCode).toBe(statusCodes.forbidden)

      const $ = load(asHtml(response.result))
      expect($('h1').text().trim()).toBe(
        'You do not have access to this service'
      )
      expect($('[data-testid="app-page-body"]').text()).toContain(
        'your account has no role in this service'
      )
    })

    it('names no identity provider to a reader who has just been refused', async ({
      server,
      msw
    }) => {
      const response = await performSignInFlow(server, msw, regulatorToken)

      expect(asHtml(response.result)).not.toMatch(/entra/i)
    })

    it('creates no session', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, regulatorToken)

      const setCookieHeaders = []
        .concat(response.headers['set-cookie'] ?? [])
        .join(';')

      expect(setCookieHeaders).not.toContain('userSession=')
    })

    it('leaves the refused user unauthenticated on an operator route', async ({
      server,
      msw
    }) => {
      const response = await performSignInFlow(server, msw, regulatorToken)

      const operatorResponse = await server.inject({
        method: 'GET',
        url: `/organisations/${randomUUID()}`,
        headers: { cookie: cookieHeaderFrom(response) }
      })

      expect(operatorResponse.statusCode).toBe(statusCodes.found)
      expect(operatorResponse.headers['location']).toBe('/logged-out')
    })

    it('records sign in failure metric', async ({ server, msw }) => {
      await performSignInFlow(server, msw, regulatorToken)

      expect(mock.signInSuccessMetric).not.toHaveBeenCalled()
      expect(mock.signInFailureMetric).toHaveBeenCalledTimes(1)
      expect(mock.signInFailureMetric).toHaveBeenCalledWith('entra-id')
    })

    it('does not audit a sign in', async ({ server, msw }) => {
      await performSignInFlow(server, msw, regulatorToken)

      expect(mock.cdpAuditing).not.toHaveBeenCalled()
    })
  })

  describe('on unsuccessful attempt to invoke SSO callback from Entra ID', () => {
    let response

    beforeEach(async ({ server }) => {
      const code = randomUUID()
      response = await server.inject({
        method: 'GET',
        url: `/auth/callback/entra?code=${code}&refresh=1` // does not supply state or other required parameters
      })
    })

    it('redirects user to start page', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })

    it('records sign in failure metric', () => {
      expect(mock.signInFailureMetric).toHaveBeenCalledTimes(1)
      expect(mock.signInFailureMetric).toHaveBeenCalledWith('entra-id')
    })
  })

  describe('on Entra ID token response without an access token', () => {
    let response

    beforeEach(async ({ server, msw }) => {
      response = await performSignInFlow(server, msw, {
        accessToken: undefined,
        publicKey: regulatorToken.publicKey
      })
    })

    it('redirects user to start page', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })

    it('records sign in failure metric', () => {
      expect(mock.signInFailureMetric).toHaveBeenCalledTimes(1)
      expect(mock.signInFailureMetric).toHaveBeenCalledWith('entra-id')
    })
  })

  describe('on unverified access token received from Entra ID', () => {
    let response

    beforeEach(async ({ server, msw }) => {
      response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        accessToken: 'invalidToken'
      })
    })

    it('redirects user to start page', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })

    it('records sign in failure metric', () => {
      expect(mock.signInFailureMetric).toHaveBeenCalledTimes(1)
      expect(mock.signInFailureMetric).toHaveBeenCalledWith('entra-id')
    })
  })

  describe('on an access token issued by someone other than the provider the discovery document names', () => {
    let response

    // Differs from the accepted token in its `iss` claim alone. It is signed
    // by the key the JWKS endpoint answers with, so only the issuer check can
    // refuse it. Remove that check and this test signs a regulator in.
    beforeEach(async ({ server, msw }) => {
      const impostorToken = await generateAccessToken({
        ...claims,
        iss: 'https://login.microsoftonline.com/another-tenant/v2.0',
        roles: ['Waste.Regulator.Standard']
      })

      response = await performSignInFlow(server, msw, impostorToken)
    })

    it('refuses the sign in and redirects to the start page', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })

    it('creates no session', () => {
      const setCookieHeaders = []
        .concat(response.headers['set-cookie'] ?? [])
        .join(';')

      expect(setCookieHeaders).not.toContain('userSession=')
    })
  })

  describe('on unverified access token received from Entra ID, with a referrer recorded', () => {
    let response

    beforeEach(async ({ server, msw }) => {
      response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        accessToken: 'invalidToken',
        referer: 'http://localhost:3000/some/prior/page'
      })
    })

    it('redirects back to the referring page instead of the default', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/some/prior/page')
    })
  })

  describe('on unverified access token received from Entra ID, with an auth callback referrer', () => {
    let response

    beforeEach(async ({ server, msw }) => {
      response = await performSignInFlow(server, msw, {
        ...regulatorToken,
        accessToken: 'invalidToken',
        referer: 'http://localhost:3000/auth/callback/entra'
      })
    })

    it('redirects to the default page rather than looping back to the callback', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })
  })
})
