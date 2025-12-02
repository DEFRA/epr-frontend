import Boom from '@hapi/boom'

import { config } from '#config/config.js'

/**
 * Fetch JSON from a given path in the backend service.
 * @param {string} path - The API path to append to the backend URL
 * @param {RequestInit} [options] - Fetch API options (method, headers, body, etc.)
 * @returns {Promise<object>} The parsed JSON response or throws a Boom error
 */
export const fetchJsonFromBackend = async (path, options) => {
  const eprBackendUrl = config.get('eprBackendUrl')

  const completeOptions = {
    ...options,
    headers: {
      ...options?.headers,
      'Content-Type': 'application/json'
    }
  }

  const url = `${eprBackendUrl}${path}`

  try {
    const response = await fetch(url, completeOptions)

    if (!response.ok) {
      const error = Boom.boomify(
        new Error(
          `Failed to fetch from backend at url: ${url}: ${response.status} ${response.statusText}`
        ),
        { statusCode: response.status }
      )

      if (response.headers.get('content-type')?.includes('application/json')) {
        error.output.payload = await response.json()
      }

      throw error
    }

    return await response.json()
  } catch (error) {
    if (error.isBoom) {
      throw error
    }

    throw Boom.internal(
      `Failed to fetch from backend at url: ${url}: ${error.message}`
    )
  }
}
