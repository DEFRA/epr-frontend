import { errorCodes } from '#server/common/enums/error-codes.js'
import { asHapiRequest } from '#server/common/hapi-types.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { findOrganisationById } from './find-organisation.js'
import { routeKeySegments, urlKeyForm } from './key-form.js'
import { redirectPreservingMethod } from '#server/common/helpers/redirect-preserving-method.js'
import { toNaturalKeys } from './swap-keys.js'

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 * @import { KeyedRecord, KeyedSegment } from './key-form.js'
 * @import { NaturalKeys, RecordIds } from './types.js'
 */

/** @type {Record<KeyedRecord, keyof RecordIds>} */
const ID_FIELDS = {
  organisation: 'organisationId',
  registration: 'registrationId',
  accreditation: 'accreditationId'
}

/** @type {Record<KeyedRecord, keyof NaturalKeys>} */
const NATURAL_KEY_FIELDS = {
  organisation: 'organisationNumber',
  registration: 'registrationNumber',
  accreditation: 'year'
}

/**
 * @param {string[]} pathSegments
 * @param {KeyedSegment[]} segments
 * @returns {RecordIds}
 */
const readIds = (pathSegments, segments) =>
  /** @type {RecordIds} */ (
    Object.fromEntries(
      segments.map(({ index, record }) => [
        ID_FIELDS[record],
        pathSegments[index]
      ])
    )
  )

/**
 * Sends an old page URL holding ids to its natural-key address (ADR 0053).
 * @param {Request} rawRequest
 * @param {ResponseToolkit} h
 */
export const naturalKeyRedirect = async (rawRequest, h) => {
  const request = asHapiRequest(rawRequest)
  const segments = routeKeySegments(request.route.path)

  if (!segments) {
    return h.continue
  }

  const pathSegments = request.path.split('/')

  if (urlKeyForm(pathSegments, segments) !== 'ids') {
    return h.continue
  }

  void metrics.pageUrl.oldRequested()

  const ids = readIds(pathSegments, segments)
  const organisation = await findOrganisationById(
    ids.organisationId,
    request.auth.credentials.backendToken
  )
  const naturalKeys = organisation && toNaturalKeys(organisation, ids)

  if (!naturalKeys) {
    throw notFound('Record not found by key', errorCodes.recordKeyUnresolved, {
      event: { action: 'redirect_by_key', reason: 'unresolved' }
    })
  }

  for (const { index, record } of segments) {
    pathSegments[index] = /** @type {string} */ (
      naturalKeys[NATURAL_KEY_FIELDS[record]]
    )
  }

  return redirectPreservingMethod(request, h, pathSegments.join('/')).takeover()
}
