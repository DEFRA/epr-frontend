import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#config/config.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { badGateway, classifierTail, internal } from './logging/cdp-boom.js'
import { getTracingHeaderName } from './request-tracing.js'

/**
 * Fetches a backend path that answers with a redirect, and returns where it
 * points without following it.
 *
 * The caller passes its own `Authorization`, as `fetchJsonFromBackend` does.
 * @param {string} path - The API path to append to the backend URL
 * @param {RequestInit} [options] - Fetch API options
 * @returns {Promise<string>} The redirect's Location
 */
export const fetchRedirectFromBackend = async (path, options) => {
  const url = new URL(path, config.get('eprBackendUrl')).href

  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'manual',
      headers: withTraceId(getTracingHeaderName(), { ...options?.headers })
    })

    const location = response.headers.get('location')

    if (!location) {
      throw badGateway(
        `Backend did not return a redirect for: ${url}`,
        errorCodes.externalRedirectInvalid,
        {
          event: {
            action: 'external_redirect',
            reason: 'missing_location_header'
          }
        }
      )
    }

    return location
  } catch (error) {
    if (error.isBoom) {
      throw error
    }

    throw internal(
      `Failed to fetch redirect from url: ${url}`,
      errorCodes.externalFetchFailed,
      {
        event: {
          action: 'external_fetch',
          reason: classifierTail(error)
        }
      }
    )
  }
}
