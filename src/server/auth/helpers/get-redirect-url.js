import { config } from '#config/config.js'

/** @import { Request } from '@hapi/hapi' */

const PRODUCTION_SERVICE_URL =
  'https://record-reprocessed-exported-packaging-waste.defra.gov.uk'

const VALID_PROTOCOLS = new Set(['http', 'https'])

/**
 * Gets a redirect URL from the request, restricted to allowed origins
 * @param {Request} request
 * @param {string} path
 * @returns {string}
 */
const getRedirectUrl = (request, path) => {
  const appBaseUrl = config.get('appBaseUrl')
  const allowedOrigins = new Set([appBaseUrl, PRODUCTION_SERVICE_URL])

  const forwardedProto = request.headers['x-forwarded-proto']
  const protocol = VALID_PROTOCOLS.has(forwardedProto)
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
