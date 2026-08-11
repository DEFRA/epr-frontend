import { config } from '#config/config.js'

/** @import { HapiRequest } from '#server/common/hapi-types.js' */

const VALID_PROTOCOLS = new Set(['http', 'https'])

/**
 * Gets a redirect URL from the request, restricted to allowed origins
 * @param {HapiRequest} request
 * @param {string} path
 * @returns {string}
 */
const getRedirectUrl = (request, path) => {
  const appBaseUrl = config.get('appBaseUrl')
  const allowedOrigins = new Set(
    [appBaseUrl, ...config.get('allowedRedirectOrigins')].map(
      (value) => URL.parse(value)?.origin
    )
  )

  const forwardedProto = request.headers['x-forwarded-proto']
  const protocol =
    typeof forwardedProto === 'string' && VALID_PROTOCOLS.has(forwardedProto)
      ? forwardedProto
      : request.server.info.protocol

  const requestUrl = new URL(appBaseUrl)
  requestUrl.protocol = protocol
  requestUrl.host = request.info.host

  const origin = allowedOrigins.has(requestUrl.origin)
    ? requestUrl.origin
    : appBaseUrl

  return new URL(path, origin).href
}

export { getRedirectUrl }
