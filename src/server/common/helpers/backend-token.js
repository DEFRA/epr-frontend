/**
 * @import { Brand } from './brand.js'
 */

/**
 * The token a session presents to the backend.
 *
 * Branded so it cannot be swapped with another string, such as an
 * organisation number. Lint allows `toBackendToken` only in a sign-in provider
 * and in tests.
 * @typedef {Brand<string, 'BackendToken'>} BackendToken
 */

/**
 * @param {string} value
 * @returns {BackendToken}
 */
export const toBackendToken = (value) => /** @type {BackendToken} */ (value)
