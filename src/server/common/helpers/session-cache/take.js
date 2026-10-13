/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * Reads a value left by the previous request and clears it, touching the
 * session only when there was something to take so a visit that leaves no
 * value does not start one.
 * @param {HapiRequest['yar']} yar
 * @param {string} key
 * @returns {unknown}
 */
export const take = (yar, key) => {
  const value = yar.get(key)

  if (value !== null) {
    yar.clear(key)
  }

  return value
}
