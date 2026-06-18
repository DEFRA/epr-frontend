import * as jose from 'jose'
import { Metrics } from '@defra/cdp-metrics'
import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'
import { createPrivateKey, generateKeyPairSync, randomUUID } from 'node:crypto'

const mock = {
  cdpAuditing: vi.fn()
}

const counterSpy = vi.spyOn(Metrics.prototype, 'counter').mockResolvedValue()

vi.mock(import('@defra/cdp-auditing'), () => ({
  audit: (...args) => mock.cdpAuditing(...args)
}))

const performSignInFlow = async (server, mswServer, { idToken, publicKey }) => {
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

  mswServer.use(
    http.post('http://defra-id.auth/token', () =>
      HttpResponse.json({ id_token: idToken })
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

async function generateIdToken(/** @type {Record<string, unknown>} */ payload) {
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

  return { idToken: jwt, publicKey }
}

describe('/auth/callback - GET integration', async () => {
  const idTokenAndPublicKey = await generateIdToken({
    sub: 'user-id',
    email: 'user@email.com'
  })

  describe('on successful return from Defra ID - unlinked organisation', () => {
    beforeEach(({ msw }) => {
      const backendUrl = config.get('eprBackendUrl')
      msw.use(
        http.get(`${backendUrl}/v1/me/organisations`, () => {
          return HttpResponse.json({
            organisations: {
              current: {
                id: 'organisation-id',
                name: 'company-name'
              },
              linked: null,
              unlinked: []
            }
          })
        })
      )
    })

    it('redirects to account linking page', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/account/linking')
    })

    it('records sign in success metric', async ({ server, msw }) => {
      await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(counterSpy).toHaveBeenCalledWith('signInSuccess')
    })

    it('audits a successful sign in attempt', async ({ server, msw }) => {
      await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(mock.cdpAuditing).toHaveBeenCalledTimes(1)
      expect(mock.cdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
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

  describe('on successful return from Defra ID - linked organisation', () => {
    const userOrganisationsResponse = {
      organisations: {
        current: { id: 'organisation-id', name: 'company-name' },
        linked: {
          id: 'linked-org-id',
          name: 'Linked Company',
          linkedBy: { id: 'user-id', email: 'user@email.com' },
          linkedAt: '2025-01-01T00:00:00.000Z'
        },
        unlinked: []
      }
    }

    beforeEach(({ msw }) => {
      const backendUrl = config.get('eprBackendUrl')

      msw.use(
        http.get(`${backendUrl}/v1/me/organisations`, () => {
          return HttpResponse.json(userOrganisationsResponse)
        }),
        http.put(
          `${backendUrl}/v1/organisations/:organisationId/user`,
          () => new HttpResponse(null, { status: 200 })
        )
      )
    })

    it('redirects to organisation dashboard', async ({ server, msw }) => {
      const response = await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/organisations/linked-org-id')
    })

    it('calls add user to organisation API with the linked organisation id', async ({
      server,
      msw
    }) => {
      const backendUrl = config.get('eprBackendUrl')
      let capturedOrganisationId

      msw.use(
        http.get(`${backendUrl}/v1/me/organisations`, () => {
          return HttpResponse.json(userOrganisationsResponse)
        }),
        http.put(
          `${backendUrl}/v1/organisations/:organisationId/user`,
          ({ params }) => {
            capturedOrganisationId = params.organisationId
            return new HttpResponse(null, { status: 200 })
          }
        )
      )

      await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(capturedOrganisationId).toBe('linked-org-id')
    })

    it('records sign in success metric', async ({ server, msw }) => {
      await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(counterSpy).toHaveBeenCalledWith('signInSuccess')
    })

    it('audits a successful sign in attempt', async ({ server, msw }) => {
      await performSignInFlow(server, msw, idTokenAndPublicKey)

      expect(mock.cdpAuditing).toHaveBeenCalledTimes(1)
      expect(mock.cdpAuditing).toHaveBeenCalledWith({
        event: {
          category: 'access',
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

  describe('on unsuccessful attempt to invoke SSO callback from Defra ID', () => {
    let response

    beforeEach(async ({ server }) => {
      const code = randomUUID()
      response = await server.inject({
        method: 'GET',
        url: `/auth/callback?code=${code}&refresh=1` // does not supply state or other required parameters
      })
    })

    it('redirects user to start page', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })

    it('records sign in failure metric', () => {
      expect(counterSpy).toHaveBeenCalledWith('signInFailure')
    })
  })

  describe('on unverified id token received from Defra ID', () => {
    let response

    beforeEach(async ({ server, msw }) => {
      response = await performSignInFlow(server, msw, {
        ...idTokenAndPublicKey,
        idToken: 'invalidToken'
      })
    })

    it('redirects user to start page', () => {
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers['location']).toBe('/')
    })

    it('records sign in failure metric', () => {
      expect(counterSpy).toHaveBeenCalledWith('signInFailure')
    })
  })

  describe('non-initial user metrics', () => {
    it('records signInSuccessNonInitialUser metric when user is not the linkedBy user', async ({
      server,
      msw
    }) => {
      const backendUrl = config.get('eprBackendUrl')
      msw.use(
        http.get(`${backendUrl}/v1/me/organisations`, () => {
          return HttpResponse.json({
            organisations: {
              current: { id: 'organisation-id', name: 'company-name' },
              linked: {
                id: 'linked-org-id',
                name: 'Linked Company',
                linkedBy: {
                  id: 'original-linker-id',
                  email: 'linker@email.com'
                },
                linkedAt: '2025-01-01T00:00:00.000Z'
              },
              unlinked: []
            }
          })
        }),
        http.put(
          `${backendUrl}/v1/organisations/:organisationId/user`,
          () => new HttpResponse(null, { status: 200 })
        )
      )

      const invitedUserToken = await generateIdToken({
        sub: 'invited-user-id',
        email: 'invited@email.com'
      })

      await performSignInFlow(server, msw, invitedUserToken)

      expect(counterSpy).toHaveBeenCalledWith('signInSuccessNonInitialUser')
    })

    it('does not record signInSuccessNonInitialUser metric when user is the linkedBy user (initial user)', async ({
      server,
      msw
    }) => {
      const backendUrl = config.get('eprBackendUrl')
      msw.use(
        http.get(`${backendUrl}/v1/me/organisations`, () => {
          return HttpResponse.json({
            organisations: {
              current: { id: 'organisation-id', name: 'company-name' },
              linked: {
                id: 'linked-org-id',
                name: 'Linked Company',
                linkedBy: { id: 'linker-user-id', email: 'linker@email.com' },
                linkedAt: '2025-01-01T00:00:00.000Z'
              },
              unlinked: []
            }
          })
        }),
        http.put(
          `${backendUrl}/v1/organisations/:organisationId/user`,
          () => new HttpResponse(null, { status: 200 })
        )
      )

      const linkerToken = await generateIdToken({
        sub: 'linker-user-id',
        email: 'linker@email.com'
      })

      await performSignInFlow(server, msw, linkerToken)

      expect(counterSpy).not.toHaveBeenCalledWith('signInSuccessNonInitialUser')
    })
  })
})
