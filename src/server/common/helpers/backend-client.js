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
 * @typedef {Record<string, string | number | undefined>} Query
 */

/**
 * @template T
 * @typedef {{ onError?: OnError, parse?: Parse<T>, query?: Query }} CallOptions
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
 * every field the backend got wrong, and how, but never the values it sent. A
 * response with no body fails too.
 * @template T
 * @param {Schema<T>} schema
 * @returns {Parse<T>}
 */
export const strictly =
  (schema) =>
  (payload, { url }) => {
    const { error, value } = schema
      .required()
      .validate(payload, { abortEarly: false })

    if (error) {
      throw badGateway(
        `Invalid response from url: ${url}`,
        errorCodes.backendResponseInvalid,
        {
          event: {
            action: 'parse_backend_response',
            reason: error.details
              .map(
                (detail) =>
                  `${detail.path.join('.') || 'response'}: ${detail.type}`
              )
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
 * @param {Error} cause
 */
const fetchFailed = (url, cause) =>
  internal(`Failed to fetch from url: ${url}`, errorCodes.externalFetchFailed, {
    event: { action: 'external_fetch', reason: classifierTail(cause) },
    cause
  })

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
  } catch (error) {
    throw fetchFailed(url, error)
  }
}

/**
 * @param {string} url
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
const readJson = async (url, response) => {
  try {
    return await response.json()
  } catch (error) {
    throw fetchFailed(url, error)
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
    error.output.payload = /** @type {Boom.Payload} */ (
      await readJson(url, response)
    )
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

  return hasJsonBody(response) ? readJson(url, response) : undefined
}

/**
 * Calls the backend as `token`. A call's `onError` wins over the client's.
 * @param {string} token
 * @param {{ onError?: OnError }} [defaults]
 */
export const backend = (token, defaults = {}) => {
  /**
   * @param {string} endpoint
   * @param {Query} [query]
   */
  const urlOf = (endpoint, query = {}) => {
    const url = new URL(endpoint, config.get('eprBackendUrl'))

    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .forEach(([key, value]) => url.searchParams.append(key, String(value)))

    return url.href
  }

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
   * @param {string} endpoint
   * @param {unknown} body
   * @param {CallOptions<T>} options
   * @returns {Promise<T>}
   */
  const call = (method, endpoint, body, { parse, query, ...options }) =>
    guarded(options, async () => {
      const url = urlOf(endpoint, query)
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
     * @param {string} endpoint
     * @param {unknown} [body]
     * @param {CallOptions<T>} [options]
     * @returns {Promise<T>}
     */
    (endpoint, body, options = {}) =>
      call(method, endpoint, body, options)

  return {
    /**
     * @template [T=unknown]
     * @param {string} endpoint
     * @param {CallOptions<T>} [options]
     * @returns {Promise<T>}
     */
    get: (endpoint, options = {}) => call('GET', endpoint, undefined, options),
    post: withBody('POST'),
    put: withBody('PUT'),
    patch: withBody('PATCH'),
    /**
     * @template [T=void]
     * @param {string} endpoint
     * @param {CallOptions<T>} [options]
     * @returns {Promise<T>}
     */
    delete: (endpoint, options = {}) =>
      call('DELETE', endpoint, undefined, options)
  }
}
