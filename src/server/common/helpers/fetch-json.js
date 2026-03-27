import Boom from '@hapi/boom'

import { withTraceId } from '@defra/hapi-tracing'
import { getTracingHeaderName } from './request-tracing.js'

/** @import {RequestInit} from 'undici' */

/**
 * Fetch from a given url, returning parsed JSON if the response has a JSON
 * content-type, or undefined for responses with no body (e.g. 204 No Content).
 * @param {string} url
 * @param {RequestInit} [options] - Fetch API options (method, headers, body, etc.)
 * @returns {Promise<object | undefined>} The parsed JSON response, or undefined
 */
export const fetchJson = async (url, options) => {
  const completeOptions = {
    ...options,
    headers: withTraceId(getTracingHeaderName(), {
      ...options?.headers,
      'Content-Type': 'application/json'
    })
  }

  try {
    const response = await fetch(url, completeOptions)

    if (!response.ok) {
      const error = Boom.boomify(
        new Error(
          `Failed to fetch from url: ${url}: ${response.status} ${response.statusText}`
        ),
        { statusCode: response.status }
      )

      if (response.headers.get('content-type')?.includes('application/json')) {
        error.output.payload = await response.json()
      }

      throw error
    }

    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json()
    }
  } catch (error) {
    if (error.isBoom) {
      throw error
    }

    throw Boom.internal(`Failed to fetch from url: ${url}: ${error.message}`)
  }
}
