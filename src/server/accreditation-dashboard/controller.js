import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import Boom from '@hapi/boom'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { t: localise } = request
    const { organisationId, accreditationId } = request.params

    const { ok, value: session } = await getUserSession(request)
    const userSession = ok && session ? session : request.auth?.credentials

    request.logger.info(
      {
        organisationId,
        accreditationId,
        hasSession: ok,
        hasIdToken: !!userSession?.idToken
      },
      'Accreditation dashboard accessed'
    )

    const organisationData = await getOrganisationData(
      request,
      organisationId,
      userSession?.idToken
    )

    const accreditation = organisationData.accreditations.find(
      (acc) => acc.id === accreditationId
    )

    if (!accreditation) {
      request.logger.warn({ accreditationId }, 'Accreditation not found')
      throw Boom.notFound('Accreditation not found')
    }

    const registration = organisationData.registrations.find(
      (reg) => reg.accreditationId === accreditationId
    )

    const viewModel = buildViewModel({
      request,
      localise,
      organisationId,
      accreditation,
      registration
    })

    return h.view('accreditation-dashboard/index', viewModel)
  }
}

/**
 * Fetch organisation data from backend
 * @param {object} request - Hapi request object
 * @param {string} organisationId - Organisation ID
 * @param {string|undefined} idToken - User's ID token
 * @returns {Promise<object>} Organisation data
 */
async function getOrganisationData(request, organisationId, idToken) {
  try {
    return await fetchOrganisationById(organisationId, idToken)
  } catch (error) {
    request.logger.error({ error }, 'Failed to fetch organisation')
    throw Boom.notFound('Organisation not found')
  }
}

/**
 * Build view model for accreditation dashboard
 * @param {object} params - Parameters for building view model
 * @returns {object} View model
 */
function buildViewModel({
  request,
  localise,
  organisationId,
  accreditation,
  registration
}) {
  const isExporter = accreditation.wasteProcessingType === 'exporter'
  const siteName = getSiteName(accreditation, registration, isExporter)
  const material = capitalise(accreditation.material)

  const registrationStatus = capitalise(registration?.status)
  const accreditationStatus = capitalise(accreditation.status)

  const uploadSummaryLogUrl = registration
    ? request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registration.id}/summary-logs/upload`
      )
    : null

  return {
    pageTitle: localise('accreditation-dashboard:pageTitle'),
    siteName,
    material,
    isExporter,
    registrationStatus,
    registrationStatusClass: getStatusClass(registrationStatus),
    accreditationStatus,
    accreditationStatusClass: getStatusClass(accreditationStatus),
    registrationNumber: registration?.cbduNumber,
    accreditationNumber: accreditation.accreditationNumber,
    hasRegistrationStatus: !!registrationStatus,
    hasAccreditationStatus: !!accreditationStatus,
    hasRegistrationNumber: !!registration?.cbduNumber,
    hasAccreditationNumber: !!accreditation.accreditationNumber,
    hasSiteName: !!siteName,
    hasUploadLink: !!uploadSummaryLogUrl,
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
 * @param {Function} localise - Localisation function
 * @param {boolean} isExporter - Whether accreditation is for exporter
 * @returns {object} PRN label properties
 */
function getPrnLabels(localise, isExporter) {
  if (isExporter) {
    return {
      prnLabel: localise('accreditation-dashboard:perns'),
      prnDescription: localise('accreditation-dashboard:pernsDescription'),
      prnNotAvailable: localise('accreditation-dashboard:pernNotAvailable')
    }
  }
  return {
    prnLabel: localise('accreditation-dashboard:prns'),
    prnDescription: localise('accreditation-dashboard:prnsDescription'),
    prnNotAvailable: localise('accreditation-dashboard:prnNotAvailable')
  }
}

/**
 * Get site name from accreditation or registration
 * Site is only applicable for reprocessors, not exporters
 * @param {object} accreditation
 * @param {object|undefined} registration
 * @param {boolean} isExporter
 * @returns {string|null}
 */
function getSiteName(accreditation, registration, isExporter) {
  if (accreditation.site?.address?.line1) {
    return accreditation.site.address.line1
  }
  if (registration?.site?.address?.line1) {
    return registration.site.address.line1
  }
  // Site is not applicable for exporters - return null instead of "Unknown site"
  return isExporter ? null : 'Unknown site'
}

/**
 * Capitalise first letter of string
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  if (!str) {
    return ''
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
