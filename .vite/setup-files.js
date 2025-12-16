/**
 * Vitest setup file - runs before all tests and module imports
 *
 * Purpose: Ensure tests are isolated from environment variables set on
 * developer machines or CI systems.
 *
 * This prevents test failures caused by local environment configuration
 * leaking into the test environment.
 */

// Unset DEFRA_ID_OIDC_CONFIGURATION_URL to ensure tests rely on the
// default empty string from config.js (line 237)
// This prevents auth from being enabled during tests unless explicitly set
delete process.env.DEFRA_ID_OIDC_CONFIGURATION_URL
