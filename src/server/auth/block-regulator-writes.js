import { SCOPES } from '#server/auth/scopes.js'
import Boom from '@hapi/boom'

/**
 * Defence in depth for the read-only regulator role. The backend is the
 * authoritative authorisation point and already refuses a regulator's writes;
 * this stops one reaching it at all. Every mutating route in this app uses a
 * non-GET method, and every route a signed-out or neutral journey needs is a
 * GET, so the method alone decides.
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function blockRegulatorWrites(request, h) {
  const scope = request.auth.credentials?.scope ?? []

  if (request.method !== 'get' && scope.includes(SCOPES.regulator)) {
    throw Boom.forbidden(
      'Access denied: regulators cannot change operator data'
    )
  }

  return h.continue
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
