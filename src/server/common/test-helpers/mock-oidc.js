import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

/**
 * Mock OIDC configuration response
 * Matches the structure returned by cdp-defra-id-stub
 */
const mockOidcConfiguration = {
  issuer: 'http://localhost:3200/cdp-defra-id-stub',
  authorization_endpoint: 'http://localhost:3200/cdp-defra-id-stub/authorize',
  token_endpoint: 'http://localhost:3200/cdp-defra-id-stub/token',
  userinfo_endpoint: 'http://localhost:3200/cdp-defra-id-stub/userinfo',
  end_session_endpoint: 'http://localhost:3200/cdp-defra-id-stub/logout',
  jwks_uri: 'http://localhost:3200/.well-known/jwks.json',
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
}

/**
 * MSW request handlers for OIDC endpoints
 */
const oidcHandlers = [
  // OIDC discovery endpoint
  http.get(
    'http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration',
    () => {
      return HttpResponse.json(mockOidcConfiguration)
    }
  )
]

/**
 * Create and configure MSW server for OIDC tests
 * @returns {import('msw/node').SetupServer}
 */
const createMockOidcServer = () => {
  return setupServer(...oidcHandlers)
}

export { createMockOidcServer, mockOidcConfiguration, oidcHandlers }
