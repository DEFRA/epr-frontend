import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'

const SAFE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/

/**
 * Validates and returns a safe path segment
 * @param {string} value
 * @param {string} fieldName
 */
function getSafePathSegment(value, fieldName) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !SAFE_PATH_SEGMENT_PATTERN.test(value)
  ) {
    throw Boom.badRequest(`Invalid ${fieldName}`)
  }
  return value
}

/**
 * Strict pattern for safe path segments (alphanumeric, hyphens, underscores).
 */
const safeSegmentPattern = /^[\w-]+$/

/**
 * Validates a path segment contains only safe characters.
 * Throws a 400 Bad Request if the value is invalid.
 * @param {string} value
 * @param {string} name - parameter name for error reporting
 * @returns {string}
 */
function getSafePathSegment(value, name) {
  if (typeof value !== 'string' || !safeSegmentPattern.test(value)) {
    throw Boom.badRequest(`Invalid path segment for ${name}`)
  }
  return value
}

/**
 * Builds the base path for PRN routes from request params.
 * Validates segments with getSafePathSegment to prevent path traversal/injection.
 * @param {{ organisationId: string, registrationId: string, accreditationId: string }} params
 */
function buildPrnBasePath({ organisationId, registrationId, accreditationId }) {
  const safeOrgId = getSafePathSegment(organisationId, 'organisationId')
  const safeRegId = getSafePathSegment(registrationId, 'registrationId')
  const safeAccId = getSafePathSegment(accreditationId, 'accreditationId')
  return `/organisations/${safeOrgId}/registrations/${safeRegId}/accreditations/${safeAccId}/packaging-recycling-notes`
}

/**
 * Fetches PRN with registration data for GET handlers.
 * Guards the feature flag, extracts request params, and fetches data in parallel.
 * @param {Request} request
 */
async function fetchPrnContext(request) {
  if (!config.get('featureFlags.prns')) {
    throw Boom.notFound()
  }

  const { organisationId, registrationId, accreditationId, prnId } =
    request.params
  const safePrnId = getSafePathSegment(prnId, 'prnId')
  const session = request.auth.credentials
  const basePath = buildPrnBasePath({
    organisationId,
    registrationId,
    accreditationId
  })
  const safePrnId = getSafePathSegment(prnId, 'prnId')

  const [registrationData, prn] = await Promise.all([
    fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    ),
    fetchPackagingRecyclingNote(
      organisationId,
      registrationId,
      accreditationId,
      safePrnId,
      session.idToken
    )
  ])

  return {
    organisationId,
    registrationId,
    accreditationId,
    ...registrationData,
    prn,
    basePath,
    prnId: safePrnId
  }
}

/**
 * Fetches PRN data for POST handlers that update status.
 * Guards the feature flag, extracts request params, and fetches the PRN.
 * @param {Request} request
 */
async function fetchPrnForUpdate(request) {
  if (!config.get('featureFlags.prns')) {
    throw Boom.notFound()
  }

  const { organisationId, registrationId, accreditationId, prnId } =
    request.params
  const safePrnId = getSafePathSegment(prnId, 'prnId')
  const session = request.auth.credentials
  const basePath = buildPrnBasePath({
    organisationId,
    registrationId,
    accreditationId
  })
  const safePrnId = getSafePathSegment(prnId, 'prnId')

  const prn = await fetchPackagingRecyclingNote(
    organisationId,
    registrationId,
    accreditationId,
    safePrnId,
    session.idToken
  )

  return {
    organisationId,
    registrationId,
    accreditationId,
    prnId: safePrnId,
    basePath,
    prn,
    idToken: session.idToken
  }
}

export {
  buildPrnBasePath,
  fetchPrnContext,
  fetchPrnForUpdate,
  getSafePathSegment
}

/**
 * @import { Request } from '@hapi/hapi'
 */
