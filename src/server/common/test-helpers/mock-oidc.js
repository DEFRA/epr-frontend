import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

/**
 * Generate mock OIDC configuration response
 * Matches the structure returned by cdp-defra-id-stub
 * @param {string} baseUrl - Base URL for the OIDC provider (e.g., 'http://localhost:3200/cdp-defra-id-stub')
 * @returns {object} OIDC configuration object
 */
const createMockOidcConfiguration = (baseUrl) => ({
  issuer: baseUrl,
  authorization_endpoint: `${baseUrl}/authorize`,
  token_endpoint: `${baseUrl}/token`,
  userinfo_endpoint: `${baseUrl}/userinfo`,
  end_session_endpoint: `${baseUrl}/logout`,
  jwks_uri: `${new URL(baseUrl).origin}/.well-known/jwks.json`,
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

/**
 * Create MSW request handlers for OIDC endpoints
 * @param {string} baseUrl - Base URL for the OIDC provider
 * @returns {Array} MSW request handlers
 */
const createOidcHandlers = (baseUrl) => {
  const config = createMockOidcConfiguration(baseUrl)
  const origin = new URL(baseUrl).origin

  return [
    // OIDC discovery endpoint
    http.get(`${baseUrl}/.well-known/openid-configuration`, () => {
      return HttpResponse.json(config)
    }),
    // JWKS endpoint
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
 * Create and configure MSW server for OIDC tests
 * @param {string} [baseUrl] - Base URL for the OIDC provider (defaults to 'http://localhost:3200/cdp-defra-id-stub')
 * @returns {import('msw/node').SetupServer}
 */
const createMockOidcServer = (
  baseUrl = 'http://localhost:3200/cdp-defra-id-stub'
) => {
  const handlers = createOidcHandlers(baseUrl)
  return setupServer(...handlers)
}

export { createMockOidcServer, createMockOidcConfiguration, createOidcHandlers }
