/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiRequest['yar']} yar
 * @param {string} key
 * @returns {unknown}
 */
export const take = (yar, key) => {
  if (!yar.id) {
    return null
  }

  const value = yar.get(key)

  if (value !== null) {
    yar.clear(key)
  }

  return value
}
