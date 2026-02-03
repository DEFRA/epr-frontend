import Boom from '@hapi/boom'

import { withTraceId } from '@defra/hapi-tracing'
import { config } from '#config/config.js'
import { getTracingHeaderName } from './request-tracing.js'

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
    headers: withTraceId(getTracingHeaderName(), {
      ...options?.headers,
      'Content-Type': 'application/json'
    })
  }

  const url = path.startsWith('http') ? path : `${eprBackendUrl}${path}`

  try {
    const response = await fetch(url, completeOptions)

    if (!response.ok) {
      let errorBody = null
      if (response.headers.get('content-type')?.includes('application/json')) {
        errorBody = await response.json()
      }

      const error = Boom.boomify(
        new Error(
          `Failed to fetch from backend at url: ${url}: ${response.status} ${response.statusText}`
        ),
        { statusCode: response.status }
      )

      if (errorBody) {
        error.output.payload = errorBody
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
