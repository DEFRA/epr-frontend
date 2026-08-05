/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * Casts a partial mock object to the Hapi base `Request` type, for the few
 * helpers typed against `Request` directly (e.g. `catchAll`).
 * @param {unknown} data
 * @returns {Request}
 */
export const asRequest = (data) => /** @type {Request} */ (data)

/**
 * Builds a partial `HapiRequest` mock (base `Request` plus the `t` / `i18n` /
 * `localiseUrl` decorations and narrowed `auth` / `logger` / `yar`), carrying
 * only the fields the code path under test reads. Distinct from the prod
 * `asHapiRequest` in `hapi-types.js`, which narrows an already-typed `Request`.
 * @param {unknown} data
 * @returns {HapiRequest}
 */
export const mockHapiRequest = (data) => /** @type {HapiRequest} */ (data)

/**
 * Casts a partial mock object (e.g. `{ redirect: vi.fn() }`) to the Hapi
 * `ResponseToolkit`, for handler tests that stub only the toolkit methods the
 * code path under test calls.
 * @param {unknown} data
 * @returns {ResponseToolkit}
 */
export const asResponseToolkit = (data) => /** @type {ResponseToolkit} */ (data)
