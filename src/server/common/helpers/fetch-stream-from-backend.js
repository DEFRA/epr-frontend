import { Readable } from 'node:stream'

import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#config/config.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badGateway,
  classifierTail,
  internal,
  upstreamStatus
} from './logging/cdp-boom.js'
import { getTracingHeaderName } from './request-tracing.js'

/**
 * @import { ReadableStream as WebReadableStream } from 'node:stream/web'
 */

/**
 * @typedef {{
 *   body: Readable,
 *   contentDisposition: string | null,
 *   contentType: string | null
 * }} BackendStream
 */

/**
 * Fetches a backend path that answers with a body, and hands that body over as
 * a Node stream so the caller can pass it straight to `h.response(...)`.
 * Nothing is buffered: the response can be arbitrarily large.
 *
 * The caller passes its own `Authorization`, as `fetchRedirectFromBackend` does.
 * @param {string} path - The API path to append to the backend URL
 * @param {RequestInit} [options] - Fetch API options
 * @returns {Promise<BackendStream>} The body, with the type and name upstream gave it
 */
export const fetchStreamFromBackend = async (path, options) => {
  const url = new URL(path, config.get('eprBackendUrl')).href

  try {
    const response = await fetch(url, {
      ...options,
      headers: withTraceId(getTracingHeaderName(), { ...options?.headers })
    })

    if (!response.ok) {
      throw upstreamStatus(
        `Backend refused: ${url}`,
        response.status,
        errorCodes.externalFetchFailed,
        {
          event: {
            action: 'external_fetch',
            reason: `backend_responded_${response.status}`
          }
        }
      )
    }

    if (!response.body) {
      throw badGateway(
        `Backend answered with no body for: ${url}`,
        errorCodes.externalFetchFailed,
        { event: { action: 'external_fetch', reason: 'missing_body' } }
      )
    }

    // Hapi understands strings, Buffers and Node Readables; handed the Web
    // stream `fetch` answers with it serialises the object and the browser
    // receives `{}`. The cast works around an `@types/node` mismatch between
    // the Web `ReadableStream<Uint8Array<ArrayBuffer>>` and the older
    // signature `Readable.fromWeb` expects.
    const body = /** @type {WebReadableStream} */ (
      /** @type {unknown} */ (response.body)
    )

    return {
      body: Readable.fromWeb(body),
      contentDisposition: response.headers.get('content-disposition'),
      contentType: response.headers.get('content-type')
    }
  } catch (error) {
    if (error.isBoom) {
      throw error
    }

    throw internal(
      `Failed to fetch stream from url: ${url}`,
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
