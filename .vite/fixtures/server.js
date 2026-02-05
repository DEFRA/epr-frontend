/* eslint-disable n/no-unpublished-import */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { test } from 'vitest'
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

const it = test.extend({
  msw: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server = setupServer(
        awsEc2MetadataHandler,
        ...createOidcHandlers('http://defra-id.auth')
      )
      server.listen({ onUnhandledRequest: 'warn' })

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
      await server.initialize()

      await use(server)

      await server.stop()
    },
    { scope: 'test' }
  ]
})

const beforeEach = it.beforeEach

export { beforeEach, it, it as test }
