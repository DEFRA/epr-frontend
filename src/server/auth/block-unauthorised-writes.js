import { hasWriteScope } from '#server/auth/scopes.js'
import Boom from '@hapi/boom'

const READ_METHODS = Object.freeze(['get', 'head'])

/**
 * Writes that change how the browser is treated rather than what the service
 * holds. They carry no session, so there is no write scope to hold, and the
 * backend never sees them. Recording a cookie choice must work for a signed-out
 * visitor, which is the whole point of asking before anything is set.
 */
const PREFERENCE_PATHS = Object.freeze(['/cookies/consent'])

/**
 * Defence in depth for every session holding no write scope. The backend is the
 * authoritative authorisation point and already refuses a write from a session
 * that holds no write scope; this stops one reaching it at all. Method alone
 * decides, save for `PREFERENCE_PATHS`: every other mutating route in this app
 * uses a method outside `READ_METHODS`, and every route a sign-in or neutral
 * journey needs is a GET. An unrecognised method counts as a write.
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function blockUnauthorisedWrites(request, h) {
  const isWrite = !READ_METHODS.includes(request.method)

  if (
    isWrite &&
    !PREFERENCE_PATHS.includes(request.path) &&
    !hasWriteScope(request.auth.credentials)
  ) {
    throw Boom.forbidden('Access denied: this session cannot change data')
  }

  return h.continue
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
