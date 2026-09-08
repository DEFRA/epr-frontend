import Boom from '@hapi/boom'

/**
 * @import { Boom as BoomError } from '@hapi/boom'
 * @import { CdpIndexedLog } from './cdp-log-types.js'
 * @typedef {Pick<NonNullable<CdpIndexedLog['event']>, 'action' | 'reason' | 'reference'>} CdpBoomEvent
 * @typedef {BoomError & { code?: string, event?: CdpBoomEvent }} CdpBoom
 * @typedef {{ event: CdpBoomEvent, payload?: Record<string, unknown> }} CdpBoomEnrichment
 */

/**
 * Attaches CDP-indexed log enrichment fields (`code` + `event`) to a Boom
 * error and optionally merges `payload` into the response body. Mutates and
 * returns the boom so call sites read as
 * `throw badRequest('msg', 'code', { event, payload })`.
 * @param {BoomError} boom
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 * @returns {CdpBoom}
 */
const enrich = (boom, code, { event, payload }) => {
  const enriched = /** @type {CdpBoom} */ (boom)
  enriched.code = code
  enriched.event = event
  if (payload) {
    enriched.output.payload = { ...enriched.output.payload, ...payload }
  }
  return enriched
}

/**
 * Builds a 400 Boom enriched with CDP-indexed `code` and `event` fields.
 * @param {string} message
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 */
export const badRequest = (message, code, enrichment) =>
  enrich(Boom.badRequest(message), code, enrichment)

/**
 * Builds a 404 Boom enriched with CDP-indexed `code` and `event` fields.
 * @param {string} message
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 */
export const notFound = (message, code, enrichment) =>
  enrich(Boom.notFound(message), code, enrichment)

/**
 * Builds a 502 Boom enriched with CDP-indexed `code` and `event` fields, for an
 * upstream that answered in a shape we cannot use.
 * @param {string} message
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 */
export const badGateway = (message, code, enrichment) =>
  enrich(Boom.badGateway(message), code, enrichment)

/**
 * Builds a Boom of the status an upstream answered with, so its refusal
 * reaches the caller as itself rather than as a gateway fault.
 * @param {string} message
 * @param {number} statusCode
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 */
export const upstreamStatus = (message, statusCode, code, enrichment) =>
  enrich(new Boom.Boom(message, { statusCode }), code, enrichment)

/**
 * Builds a 500 Boom enriched with CDP-indexed `code` and `event` fields.
 * @param {string} message
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 */
export const internal = (message, code, enrichment) =>
  enrich(Boom.internal(message), code, enrichment)

/**
 * Builds a 500 Boom (badImplementation) enriched with CDP-indexed `code` and
 * `event` fields. Distinct from `internal` so call sites read the same as
 * the underlying `Boom.badImplementation`.
 * @param {string} message
 * @param {string} code
 * @param {CdpBoomEnrichment} enrichment
 */
export const badImplementation = (message, code, enrichment) =>
  enrich(Boom.badImplementation(message), code, enrichment)

/**
 * Composes the `type=… code=…` tail of an `event.reason` string from an
 * underlying error. Falls back to `Error` / `unknown` when fields are
 * missing so the tail keeps a fixed shape — easier to query in OpenSearch.
 * @param {{ name?: string, code?: string | number } | null | undefined} error
 * @returns {string}
 */
export const classifierTail = (error) =>
  `type=${error?.name ?? 'Error'} code=${error?.code ?? 'unknown'}`
