import { isRegulatorSession } from '#server/auth/scopes.js'
import Boom from '@hapi/boom'

const READ_METHODS = Object.freeze(['get', 'head'])

/**
 * Defence in depth for the read-only regulator role. The backend is the
 * authoritative authorisation point and already refuses a regulator's writes;
 * this stops one reaching it at all. Every mutating route in this app uses a
 * method outside `READ_METHODS`, and every route a sign-in or neutral journey
 * needs is a GET, so the method alone decides. An unrecognised method counts as
 * a write.
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function blockRegulatorWrites(request, h) {
  const isWrite = !READ_METHODS.includes(request.method)

  if (isWrite && isRegulatorSession(request.auth.credentials)) {
    throw Boom.forbidden(
      'Access denied: regulators cannot change operator data'
    )
  }

  return h.continue
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
