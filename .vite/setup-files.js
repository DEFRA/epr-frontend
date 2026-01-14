/**
 * Vitest setup file - runs before all tests and module imports
 *
 * Purpose: Configure global test environment with auth enabled.
 * MSW setup is handled by fixtures in .vite/fixtures/server.js
 */

// Set env vars before any imports to ensure config picks them up
process.env.DEFRA_ID_OIDC_CONFIGURATION_URL =
  'http://defra-id.auth/.well-known/openid-configuration'
process.env.DEFRA_ID_CLIENT_ID = 'test-client-id'
process.env.DEFRA_ID_CLIENT_SECRET = 'test-secret'
process.env.DEFRA_ID_SERVICE_ID = 'test-service-id'
