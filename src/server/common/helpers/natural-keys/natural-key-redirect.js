import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { asHapiRequest } from '#server/common/hapi-types.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import {
  findOrganisationById,
  findOrganisationByNumber
} from './find-organisation.js'
import { routeKeyForm, urlKeyForm } from './key-form.js'
import { toIds, toNaturalKeys } from './swap-keys.js'

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { KeyForm, KeyedRecord, KeyedSegment } from './key-form.js'
 * @import { NaturalKeys, RecordIds } from './types.js'
 */

const READ_METHODS = Object.freeze(['get', 'head'])

/** @type {Record<KeyForm, Record<KeyedRecord, string>>} */
const FIELDS = {
  ids: {
    organisation: 'organisationId',
    registration: 'registrationId',
    accreditation: 'accreditationId'
  },
  naturalKeys: {
    organisation: 'organisationNumber',
    registration: 'registrationNumber',
    accreditation: 'year'
  }
}

/**
 * @param {string[]} pathSegments
 * @param {KeyedSegment[]} segments
 * @param {KeyForm} form
 * @returns {Record<string, string>}
 */
const readKeys = (pathSegments, segments, form) =>
  Object.fromEntries(
    segments.map(({ index, record }) => [
      FIELDS[form][record],
      pathSegments[index]
    ])
  )

/**
 * @param {HapiRequest} request
 * @param {KeyForm} form - the form the URL holds
 * @param {Record<string, string>} keys
 * @returns {Promise<RecordIds | NaturalKeys | null>}
 */
const swapKeys = async (request, form, keys) => {
  const { credentials } = request.auth

  if (form === 'ids') {
    const ids = /** @type {RecordIds} */ (keys)
    const organisation = await findOrganisationById(
      ids.organisationId,
      credentials.backendToken
    )

    return organisation && toNaturalKeys(organisation, ids)
  }

  const naturalKeys = /** @type {NaturalKeys} */ (keys)
  const organisation = await findOrganisationByNumber(
    naturalKeys.organisationNumber,
    credentials
  )

  return organisation && toIds(organisation, naturalKeys)
}

/**
 * Sends a page URL holding ids to its route's natural-key address, and the
 * reverse, while pages move to natural keys (ADR 0053).
 * @param {Request} rawRequest
 * @param {ResponseToolkit} h
 */
export const naturalKeyRedirect = async (rawRequest, h) => {
  const request = asHapiRequest(rawRequest)
  const route = routeKeyForm(request.route.path)

  if (!route) {
    return h.continue
  }

  const pathSegments = request.path.split('/')
  const urlForm = urlKeyForm(pathSegments, route.segments)

  if (!urlForm || urlForm === route.form) {
    return h.continue
  }

  if (urlForm === 'ids') {
    void metrics.pageUrl.oldRequested()
  }

  const swapped = /** @type {Record<string, string> | null} */ (
    await swapKeys(
      request,
      urlForm,
      readKeys(pathSegments, route.segments, urlForm)
    )
  )

  if (!swapped) {
    throw notFound('Record not found by key', errorCodes.recordKeyUnresolved, {
      event: { action: 'redirect_by_key', reason: 'unresolved' }
    })
  }

  for (const { index, record } of route.segments) {
    pathSegments[index] = swapped[FIELDS[route.form][record]]
  }

  // The i18n step drops the query when it strips `/cy`, so read the original
  const { search } = new URL(
    /** @type {string} */ (request.raw.req.url),
    'http://localhost'
  )

  return h
    .redirect(request.localiseUrl(`${pathSegments.join('/')}${search}`))
    .code(
      READ_METHODS.includes(request.method)
        ? statusCodes.found
        : statusCodes.temporaryRedirect
    )
    .takeover()
}
