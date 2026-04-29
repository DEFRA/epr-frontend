import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { badRequest } from '#server/common/helpers/logging/cdp-boom.js'
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
    throw badRequest(`Invalid ${fieldName}`, errorCodes.invalidPrnField, {
      event: {
        action: 'validate_path_segment',
        reason: `field=${fieldName}`
      }
    })
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
 * Extracts request params and fetches data in parallel.
 * @param {HapiRequest} request
 */
async function fetchPrnContext(request) {
  const { organisationId, registrationId, accreditationId, prnId } =
    request.params
  const session = request.auth.credentials
  const basePath = buildPrnBasePath({
    organisationId,
    registrationId,
    accreditationId
  })
  const safePrnId = getSafePathSegment(prnId, 'prnId')

  const [registrationData, prn] = await Promise.all([
    getRequiredRegistrationWithAccreditation({
      organisationId,
      registrationId,
      idToken: session.idToken,
      logger: request.logger,
      accreditationId
    }),
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
 * Extracts request params and fetches the PRN.
 * @param {HapiRequest} request
 */
async function fetchPrnForUpdate(request) {
  const { organisationId, registrationId, accreditationId, prnId } =
    request.params
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
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
