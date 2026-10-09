import Boom from '@hapi/boom'
import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#config/config.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { classifierTail, internal } from './logging/cdp-boom.js'
import { getTracingHeaderName } from './request-tracing.js'

/**
 * Builds a backend path with every interpolated value URI-encoded.
 * @param {TemplateStringsArray} strings
 * @param {...(string | number)} values
 */
export const path = (strings, ...values) =>
  String.raw({ raw: strings }, ...values.map((v) => encodeURIComponent(v)))

/**
 * @param {Response} response
 */
const hasJsonBody = (response) =>
  response.headers.get('content-type')?.includes('application/json') ?? false

/**
 * @param {string} url
 * @param {RequestInit & { headers: Record<string, string> }} init
 */
const request = async (url, init) => {
  try {
    return await fetch(url, {
      ...init,
      headers: withTraceId(getTracingHeaderName(), init.headers)
    })
  } catch (cause) {
    throw internal(
      `Failed to fetch from url: ${url}`,
      errorCodes.externalFetchFailed,
      {
        event: { action: 'external_fetch', reason: classifierTail(cause) },
        cause
      }
    )
  }
}

/**
 * @param {string} url
 * @param {Response} response
 */
const rejection = async (url, response) => {
  const error = Boom.boomify(
    new Error(
      `Failed to fetch from url: ${url}: ${response.status} ${response.statusText}`
    ),
    { statusCode: response.status }
  )

  if (hasJsonBody(response)) {
    error.output.payload = await response.json()
  }

  return error
}

/**
 * @param {string} token
 * @param {string} method
 * @param {string} url
 * @param {unknown} [body]
 * @returns {Promise<unknown>}
 */
const sendJson = async (token, method, url, body) => {
  const hasBody = body !== undefined

  const response = await request(url, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(hasBody && { 'Content-Type': 'application/json' })
    },
    body: hasBody ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    throw await rejection(url, response)
  }

  return hasJsonBody(response) ? response.json() : undefined
}

/**
 * Calls the backend as `token`.
 * @param {string} token
 */
export const backend = (token) => {
  /**
   * @param {string} method
   * @param {string} path
   * @param {unknown} [body]
   */
  const call = (method, path, body) =>
    sendJson(
      token,
      method,
      new URL(path, config.get('eprBackendUrl')).href,
      body
    )

  /**
   * @param {string} method
   */
  const withBody =
    (method) =>
    /**
     * @param {string} path
     * @param {unknown} [body]
     */
    (path, body) =>
      call(method, path, body)

  return {
    /** @param {string} path */
    get: (path) => call('GET', path),
    post: withBody('POST'),
    put: withBody('PUT'),
    patch: withBody('PATCH'),
    /** @param {string} path */
    delete: (path) => call('DELETE', path)
  }
}
