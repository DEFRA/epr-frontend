/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * Cast a partial mock request to the decorated `HapiRequest` that handlers
 * expect. For unit tests that call a handler directly (rather than via
 * `server.inject`) with a minimal request shape.
 * @param {unknown} request
 * @returns {HapiRequest}
 */
export const asRequest = (request) => /** @type {HapiRequest} */ (request)

/**
 * Cast a partial mock response toolkit to `ResponseToolkit`. Companion to
 * `asRequest` for handler unit tests that only stub the toolkit methods they
 * exercise (e.g. `{ redirect }`).
 * @param {unknown} h
 * @returns {ResponseToolkit}
 */
export const asToolkit = (h) => /** @type {ResponseToolkit} */ (h)
