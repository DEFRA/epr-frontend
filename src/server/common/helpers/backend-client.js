import Boom from '@hapi/boom'
import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#config/config.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { badGateway, classifierTail, internal } from './logging/cdp-boom.js'
import { getTracingHeaderName } from './request-tracing.js'

/**
 * @import { Schema } from 'joi'
 */

/**
 * @typedef {(error: unknown) => never} OnError
 */

/**
 * @template T
 * @typedef {(payload: unknown, context: { url: string }) => T} Parse
 */

/**
 * @template T
 * @typedef {{ onError?: OnError, parse?: Parse<T> }} CallOptions
 */

/**
 * Builds a backend path with every interpolated value URI-encoded.
 * @param {TemplateStringsArray} strings
 * @param {...(string | number)} values
 */
export const path = (strings, ...values) =>
  String.raw({ raw: strings }, ...values.map((v) => encodeURIComponent(v)))

/**
 * Validates the response against `schema`, failing as a bad gateway that names
 * every field the backend got wrong.
 * @template T
 * @param {Schema<T>} schema
 * @returns {Parse<T>}
 */
export const strictly =
  (schema) =>
  (payload, { url }) => {
    const { error, value } = schema.validate(payload, { abortEarly: false })

    if (error) {
      throw badGateway(
        `Invalid response from url: ${url}`,
        errorCodes.backendResponseInvalid,
        {
          event: {
            action: 'parse_backend_response',
            reason: error.details
              .map((detail) => `${detail.path.join('.')}: ${detail.message}`)
              .join('; ')
          }
        }
      )
    }

    return value
  }

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
 * Calls the backend as `token`. A call's `onError` wins over the client's.
 * @param {string} token
 * @param {{ onError?: OnError }} [defaults]
 */
export const backend = (token, defaults = {}) => {
  /** @param {string} path */
  const urlOf = (path) => new URL(path, config.get('eprBackendUrl')).href

  /**
   * @template T
   * @param {{ onError?: OnError }} options
   * @param {() => Promise<T>} run
   * @returns {Promise<T>}
   */
  const guarded = async (options, run) => {
    const { onError } = { ...defaults, ...options }

    try {
      return await run()
    } catch (error) {
      onError?.(error)
      throw error
    }
  }

  /**
   * @template T
   * @param {string} method
   * @param {string} path
   * @param {unknown} body
   * @param {CallOptions<T>} options
   * @returns {Promise<T>}
   */
  const call = (method, path, body, { parse, ...options }) =>
    guarded(options, async () => {
      const url = urlOf(path)
      const payload = await sendJson(token, method, url, body)
      return parse ? parse(payload, { url }) : /** @type {T} */ (payload)
    })

  /**
   * @param {string} method
   */
  const withBody =
    (method) =>
    /**
     * @template [T=void]
     * @param {string} path
     * @param {unknown} [body]
     * @param {CallOptions<T>} [options]
     * @returns {Promise<T>}
     */
    (path, body, options = {}) =>
      call(method, path, body, options)

  return {
    /**
     * @template [T=unknown]
     * @param {string} path
     * @param {CallOptions<T>} [options]
     * @returns {Promise<T>}
     */
    get: (path, options = {}) => call('GET', path, undefined, options),
    post: withBody('POST'),
    put: withBody('PUT'),
    patch: withBody('PATCH'),
    /**
     * @template [T=void]
     * @param {string} path
     * @param {CallOptions<T>} [options]
     * @returns {Promise<T>}
     */
    delete: (path, options = {}) => call('DELETE', path, undefined, options)
  }
}
