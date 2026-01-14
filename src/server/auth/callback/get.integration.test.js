import * as jose from 'jose'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'
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
      signInFailure: () => mock.signInFailureMetric(),
      signInSuccess: () => mock.signInSuccessMetric()
    }
  })
)

vi.mock(import('@defra/cdp-auditing'), () => ({
  audit: (...args) => mock.cdpAuditing(...args)
}))

const performSignInFlow = async (server, mswServer, accessToken) => {
  const signInResponse = await server.inject({
    method: 'GET',
    url: '/login'
  })
  const ssoUrl = new URL(signInResponse.headers['location'])

  // bell-defra-id={cookieValue}; HttpOnly; SameSite=Strict; Path=/
  const bellCookie = signInResponse.headers['set-cookie']
    .toString()
    .split('=')[1]
    .split(';')[0]

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'jwk'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  const jwt = await new jose.SignJWT(accessToken)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setExpirationTime('2h')
    .sign(createPrivateKey(privateKey))

  mswServer.use(
    http.post('http://defra-id.auth/token', () =>
      HttpResponse.json({ id_token: jwt })
    )
  )

  mswServer.use(
    http.get('http://defra-id.auth/.well-known/jwks.json', () => {
      return HttpResponse.json({
        keys: [{ ...publicKey, kid: 'test-key-id' }]
      })
    })
  )

  const stateParam = ssoUrl.searchParams.get('state')
  const code = randomUUID()
  return await server.inject({
    method: 'GET',
    url: `/auth/callback?state=${stateParam}&code=${code}&refresh=1`,
    headers: {
      cookie: `bell-defra-id=${bellCookie}`
    }
  })
}

describe('/auth/callback - GET integration', () => {
  describe('on successful return from Defra ID', () => {
    const accessToken = {
      sub: 'user-id',
      email: 'user@email.com'
    }

    beforeEach(({ msw }) => {
      msw.use(
        http.get('http://localhost:3001/v1/me/organisations', () => {
          return HttpResponse.json({ organisations: {} })
        })
      )
    })

    it('redirects to account linking page', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, accessToken)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/account/linking')
    })

    it('records sign in success metric', async ({ server, msw }) => {
      await performSignInFlow(server, msw, accessToken)

      expect(mock.signInSuccessMetric).toHaveBeenCalledTimes(1)
    })

    it('audits a successful sign in attempt', async ({ server, msw }) => {
      await performSignInFlow(server, msw, accessToken)

      expect(mock.cdpAuditing).toHaveBeenCalledTimes(1)
      expect(mock.cdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
          subCategory: 'sso',
          action: 'sign-in'
        },
        context: {},
        user: {
          id: 'user-id',
          email: 'user@email.com'
        }
      })
    })
  })
})
