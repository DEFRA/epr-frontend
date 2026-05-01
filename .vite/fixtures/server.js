/* eslint-disable n/no-unpublished-import */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { test, vi } from 'vitest'
import { organisations } from '../../fixtures/waste-organisations/organisations.json' with { type: 'json' }

/**
 * Stub handler for AWS EC2 Instance Metadata Service (IMDS).
 * The AWS SDK attempts to fetch credentials from this endpoint when running on EC2.
 * In tests, we stub it to prevent MSW warnings about unhandled requests.
 */
const awsEc2MetadataHandler = http.put(
  'http://169.254.169.254/latest/api/token',
  () => new HttpResponse(null, { status: 404 })
)

const createOidcHandlers = (baseUrl) => {
  const origin = new URL(baseUrl).origin

  return [
    http.get(`${baseUrl}/.well-known/openid-configuration`, () => {
      return HttpResponse.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        userinfo_endpoint: `${baseUrl}/userinfo`,
        end_session_endpoint: `${baseUrl}/logout`,
        jwks_uri: `${origin}/.well-known/jwks.json`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'offline_access'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
        claims_supported: [
          'sub',
          'correlationId',
          'sessionId',
          'contactId',
          'serviceId',
          'firstName',
          'lastName',
          'email',
          'uniqueReference',
          'loa',
          'aal',
          'enrolmentCount',
          'enrolmentRequestCount',
          'currentRelationshipId',
          'relationships',
          'roles'
        ],
        code_challenge_methods_supported: ['plain', 'S256']
      })
    }),
    http.get(`${origin}/.well-known/jwks.json`, () => {
      return HttpResponse.json({
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'test-key-id',
            n: 'test-modulus-value',
            e: 'AQAB'
          }
        ]
      })
    })
  ]
}

/**
 * Attaches a `loggerMocks` triple onto the server and redirects both
 * `server.logger.{info,warn,error}` and per-request
 * `request.logger.{info,warn,error}` calls into those mocks. Server-level
 * spies are installed eagerly so onRequest-time logs from earlier-registered
 * extensions (e.g. user-agent truncation) are captured. Tests using the
 * `server` fixture can then assert with
 * `expect(server.loggerMocks.warn).toHaveBeenCalledWith(...)` — covering
 * server- and request-level logs uniformly.
 * @param {import('@hapi/hapi').Server & {
 *   loggerMocks?: { info: ReturnType<typeof vi.fn>, warn: ReturnType<typeof vi.fn>, error: ReturnType<typeof vi.fn> }
 * }} server
 */
const attachLoggerMocks = (server) => {
  server.loggerMocks = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

  vi.spyOn(server.logger, 'info').mockImplementation(server.loggerMocks.info)
  vi.spyOn(server.logger, 'warn').mockImplementation(server.loggerMocks.warn)
  vi.spyOn(server.logger, 'error').mockImplementation(server.loggerMocks.error)

  server.ext('onRequest', (request, h) => {
    vi.spyOn(request.logger, 'info').mockImplementation(server.loggerMocks.info)
    vi.spyOn(request.logger, 'warn').mockImplementation(server.loggerMocks.warn)
    vi.spyOn(request.logger, 'error').mockImplementation(
      server.loggerMocks.error
    )
    return h.continue
  })
}

const it = test.extend({
  msw: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server = setupServer(
        awsEc2MetadataHandler,
        ...createOidcHandlers('http://defra-id.auth')
      )
      server.listen({ onUnhandledRequest: 'error' })

      await use(server)

      server.resetHandlers()
      server.close()
    },
    { auto: true }
  ],
  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const { createServer } = await import('#server/index.js')
      const server = await createServer({ wasteOrganisations: organisations })

      attachLoggerMocks(server)

      await server.initialize()

      await use(server)

      await server.stop()
    },
    { scope: 'test' }
  ]
})

const beforeEach = it.beforeEach

export { beforeEach, it, it as test }
