/**
 * Test setup file - runs before all tests
 * Ensures a clean test environment by clearing environment variables
 * that might be set in local development environments
 */

// Clear DEFRA ID environment variables to prevent local dev config
// from polluting test environment. Tests that need auth will explicitly
// set these values using config.load() in their beforeAll hooks.
delete process.env.DEFRA_ID_OIDC_CONFIGURATION_URL
delete process.env.DEFRA_ID_SERVICE_ID
delete process.env.DEFRA_ID_CLIENT_ID
delete process.env.DEFRA_ID_CLIENT_SECRET

// Ensure tests run in test mode
process.env.NODE_ENV = 'test'
