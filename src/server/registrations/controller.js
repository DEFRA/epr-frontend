import Boom from '@hapi/boom'
import { capitalize } from 'lodash-es'

import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const session = request.auth.credentials

    const organisationData = await fetchOrganisationById(
      organisationId,
      session.idToken
    )

    const registration = organisationData.registrations?.find(
      ({ id }) => id === registrationId
    )

    if (!registration) {
      const message = 'Registration not found'
      request.logger.warn({ registrationId }, message)
      throw Boom.notFound(message)
    }

    const accreditation = organisationData.accreditations?.find(
      ({ id }) => id === registration.accreditationId
    )

    const viewModel = buildViewModel({
      request,
      organisationId,
      accreditation,
      registration
    })

    return h.view('registrations/index', viewModel)
  }
}

/**
 * Build view model for accreditation dashboard
 * @param {object} params - Function parameters
 * @param {object} params.request - Hapi request object
 * @param {string} params.organisationId - Organisation ID
 * @param {object | undefined} params.accreditation - Accreditation data
 * @param {object} params.registration - Registration data
 * @returns {object} View model
 */
function buildViewModel({
  request,
  organisationId,
  accreditation,
  registration
}) {
  const { t: localise } = request
  const isExporter = registration.wasteProcessingType === 'exporter'
  const siteName = isExporter
    ? null
    : (registration.site?.address?.line1 ??
      localise('registrations:unknownSite'))
  const material = getDisplayMaterial(registration)

  const registrationStatus = capitalize(registration.status)
  const accreditationStatus = capitalize(accreditation?.status)

  const uploadSummaryLogUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registration.id}/summary-logs/upload`
  )

  return {
    pageTitle: localise('registrations:pageTitle', { siteName, material }),
    siteName,
    material,
    isExporter,
    registrationStatus,
    registrationStatusClass: getStatusClass(registrationStatus),
    accreditationStatus,
    accreditationStatusClass: getStatusClass(accreditationStatus),
    registrationNumber: registration.registrationNumber,
    accreditationNumber: accreditation?.accreditationNumber,
    hasRegistrationStatus: !!registrationStatus,
    hasAccreditationStatus: !!accreditationStatus,
    hasRegistrationNumber: !!registration.registrationNumber,
    hasAccreditationNumber: !!accreditation?.accreditationNumber,
    hasSiteName: !!siteName,
    backUrl: isExporter
      ? request.localiseUrl(`/organisations/${organisationId}/exporting`)
      : request.localiseUrl(`/organisations/${organisationId}`),
    uploadSummaryLogUrl,
    contactRegulatorUrl: request.localiseUrl('/contact'),
    ...getPrnLabels(localise, isExporter)
  }
}

/**
 * Get PRN/PERN labels based on accreditation type
 * @param {(key: string) => string} localise - Localisation function
 * @param {boolean} isExporter - Whether accreditation is for exporter
 * @returns {object} PRN label properties
 */
function getPrnLabels(localise, isExporter) {
  if (isExporter) {
    return {
      prnLabel: localise('registrations:perns'),
      prnDescription: localise('registrations:pernsDescription'),
      prnNotAvailable: localise('registrations:pernNotAvailable')
    }
  }
  return {
    prnLabel: localise('registrations:prns'),
    prnDescription: localise('registrations:prnsDescription'),
    prnNotAvailable: localise('registrations:prnNotAvailable')
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
