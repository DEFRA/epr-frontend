/**
 * The token a session presents to the backend.
 *
 * Branded so it cannot be swapped with another string, such as an
 * organisation number. A sign-in provider mints it with `toBackendToken`.
 * @typedef {string & { readonly __brand: 'BackendToken' }} BackendToken
 */

/**
 * @param {string} value
 * @returns {BackendToken}
 */
export const toBackendToken = (value) => /** @type {BackendToken} */ (value)
