import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'

/**
 * Builds the base path for PRN routes from request params
 * @param {{ organisationId: string, registrationId: string, accreditationId: string }} params
 */
function buildPrnBasePath({ organisationId, registrationId, accreditationId }) {
  return `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
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
  const session = request.auth.credentials
  const basePath = buildPrnBasePath({
    organisationId,
    registrationId,
    accreditationId
  })

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
      prnId,
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
    prnId
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
  const session = request.auth.credentials
  const basePath = buildPrnBasePath({
    organisationId,
    registrationId,
    accreditationId
  })

  const prn = await fetchPackagingRecyclingNote(
    organisationId,
    registrationId,
    accreditationId,
    prnId,
    session.idToken
  )

  return {
    organisationId,
    registrationId,
    accreditationId,
    prnId,
    basePath,
    prn,
    idToken: session.idToken
  }
}

export { buildPrnBasePath, fetchPrnContext, fetchPrnForUpdate }

/**
 * @import { Request } from '@hapi/hapi'
 */
