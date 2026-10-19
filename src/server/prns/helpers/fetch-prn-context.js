import { getRequiredRegistrationWithAccreditationByNumber } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { badRequest } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'
import { prnsPath } from './prn-resource.js'

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
 * The accreditation's keys from a PRN route's params.
 * @param {PrnListParams} params
 * @returns {AccreditationKeys}
 */
const toAccreditationKeys = ({
  organisationNumber,
  registrationNumber,
  year
}) => ({ organisationNumber, registrationNumber, year })

/**
 * Fetches PRN with registration data for GET handlers.
 * @param {HapiRequest & { params: PrnDetailParams }} request
 */
async function fetchPrnContext(request) {
  const keys = toAccreditationKeys(request.params)
  const credentials = request.auth.credentials
  const safePrnId = getSafePathSegment(request.params.prnId, 'prnId')

  const [registrationData, prn] = await Promise.all([
    getRequiredRegistrationWithAccreditationByNumber(keys, credentials),
    fetchPackagingRecyclingNote(keys, safePrnId, credentials.backendToken)
  ])

  return {
    keys,
    ...registrationData,
    prn,
    basePath: prnsPath(keys),
    prnId: safePrnId
  }
}

/**
 * Fetches PRN data for POST handlers that update status.
 * @param {HapiRequest & { params: PrnDetailParams }} request
 */
async function fetchPrnForUpdate(request) {
  const keys = toAccreditationKeys(request.params)
  const { backendToken } = request.auth.credentials
  const safePrnId = getSafePathSegment(request.params.prnId, 'prnId')

  const prn = await fetchPackagingRecyclingNote(keys, safePrnId, backendToken)

  return {
    keys,
    prnId: safePrnId,
    basePath: prnsPath(keys),
    prn,
    backendToken
  }
}

export {
  fetchPrnContext,
  fetchPrnForUpdate,
  getSafePathSegment,
  toAccreditationKeys
}

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { PrnDetailParams, PrnListParams } from './session-types.js'
 */
