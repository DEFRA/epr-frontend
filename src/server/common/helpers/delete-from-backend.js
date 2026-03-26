import Boom from '@hapi/boom'

import { withTraceId } from '@defra/hapi-tracing'
import { config } from '#config/config.js'
import { getTracingHeaderName } from './request-tracing.js'

/** @import {RequestInit} from 'undici' */

/**
 * Send a DELETE request to the backend service. Expects a 204 No Content
 * response — does not attempt to parse a response body.
 * @param {string} path - The API path to append to the backend URL
 * @param {RequestInit} [options] - Fetch API options (headers, etc.)
 * @returns {Promise<void>}
 */
export const deleteFromBackend = async (path, options) => {
  const url = new URL(path, config.get('eprBackendUrl')).href

  const completeOptions = {
    ...options,
    method: 'DELETE',
    headers: withTraceId(getTracingHeaderName(), {
      ...options?.headers
    })
  }

  try {
    const response = await fetch(url, completeOptions)

    if (!response.ok) {
      const error = Boom.boomify(
        new Error(
          `Failed to delete from url: ${url}: ${response.status} ${response.statusText}`
        ),
        { statusCode: response.status }
      )

      if (response.headers.get('content-type')?.includes('application/json')) {
        error.output.payload = await response.json()
      }

      throw error
    }
  } catch (error) {
    if (error.isBoom) {
      throw error
    }

    throw Boom.internal(`Failed to delete from url: ${url}: ${error.message}`)
  }
}
