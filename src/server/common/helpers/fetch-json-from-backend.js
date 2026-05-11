import { config } from '#config/config.js'
import { fetchJson } from './fetch-json.js'

/**
 * Fetch JSON from a given path in the backend service.
 * @param {string} path - The API path to append to the backend URL
 * @param {RequestInit} [options] - Fetch API options (method, headers, body, etc.)
 * @returns {Promise<object>} The parsed JSON response or throws a Boom error
 */
export const fetchJsonFromBackend = async (path, options) => {
  const url = new URL(path, config.get('eprBackendUrl')).href

  return fetchJson(url, options)
}
