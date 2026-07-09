/**
 * @import { Request } from '@hapi/hapi'
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
 * Casts a partial mock object to the app's augmented `HapiRequest` type (base
 * `Request` plus the `t` / `i18n` / `localiseUrl` decorations and narrowed
 * `auth` / `logger` / `yar`). Use for the majority of handlers/helpers, which
 * are typed against `HapiRequest`; carrying only the fields the code reads.
 * @param {unknown} data
 * @returns {HapiRequest}
 */
export const asHapiRequest = (data) => /** @type {HapiRequest} */ (data)
