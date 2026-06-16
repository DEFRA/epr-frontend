/**
 * Cast a partial literal to a Hapi request for handler unit tests. Hapi's
 * request carries many framework-managed fields that can't be built in a unit
 * test, so this casts through `unknown` (mirroring `asHapiRequest`). The
 * generic return lets the handler's expected request type drive `T`.
 * @template T
 * @param {Record<string, unknown>} partial
 * @returns {T}
 */
export const asRequest = (partial) =>
  /** @type {T} */ (/** @type {unknown} */ (partial))

/**
 * Cast a partial of the toolkit methods a handler uses (e.g. `view`,
 * `redirect`) to a Hapi `ResponseToolkit`.
 * @param {Record<string, unknown>} partial
 * @returns {ResponseToolkit}
 */
export const asToolkit = (partial) =>
  /** @type {ResponseToolkit} */ (/** @type {unknown} */ (partial))

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 */
