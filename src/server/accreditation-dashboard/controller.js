import {
  getStatusClass,
  getCurrentStatus
} from '#server/organisations/helpers/status-helpers.js'
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

    let organisationData = null

    try {
      organisationData = await fetchOrganisationById(
        organisationId,
        userSession?.idToken
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to fetch organisation')
      throw Boom.notFound('Organisation not found')
    }

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

    const siteName = getSiteName(accreditation, registration)
    const material = capitalise(accreditation.material)
    const isExporter = accreditation.wasteProcessingType === 'exporter'

    const registrationStatus = getCurrentStatus(
      registration?.statusHistory || []
    )
    const accreditationStatus = getCurrentStatus(accreditation.statusHistory)

    const registrationStatusClass = getStatusClass(registrationStatus)
    const accreditationStatusClass = getStatusClass(accreditationStatus)

    const backUrl = isExporter
      ? request.localiseUrl(`/organisations/${organisationId}/exporting`)
      : request.localiseUrl(`/organisations/${organisationId}`)

    const uploadSummaryLogUrl = registration
      ? request.localiseUrl(
          `/organisations/${organisationId}/registrations/${registration.id}/summary-logs/upload`
        )
      : null

    const contactRegulatorUrl = request.localiseUrl('/contact')

    return h.view('accreditation-dashboard/index', {
      pageTitle: localise('accreditation-dashboard:pageTitle'),
      siteName,
      material,
      isExporter,
      registrationStatus,
      registrationStatusClass,
      accreditationStatus,
      accreditationStatusClass,
      registrationNumber: registration?.cbduNumber,
      accreditationNumber: accreditation.accreditationNumber,
      hasRegistrationStatus: registrationStatus !== 'Unknown',
      hasAccreditationStatus: accreditationStatus !== 'Unknown',
      hasRegistrationNumber: !!registration?.cbduNumber,
      hasAccreditationNumber: !!accreditation.accreditationNumber,
      hasUploadLink: !!uploadSummaryLogUrl,
      backUrl,
      uploadSummaryLogUrl,
      contactRegulatorUrl,
      prnLabel: isExporter
        ? localise('accreditation-dashboard:perns')
        : localise('accreditation-dashboard:prns'),
      prnDescription: isExporter
        ? localise('accreditation-dashboard:pernsDescription')
        : localise('accreditation-dashboard:prnsDescription'),
      prnNotAvailable: isExporter
        ? localise('accreditation-dashboard:pernNotAvailable')
        : localise('accreditation-dashboard:prnNotAvailable')
    })
  }
}

/**
 * Get site name from accreditation or registration
 * @param {object} accreditation
 * @param {object|undefined} registration
 * @returns {string}
 */
function getSiteName(accreditation, registration) {
  if (accreditation.site?.address?.line1) {
    return accreditation.site.address.line1
  }
  if (registration?.site?.address?.line1) {
    return registration.site.address.line1
  }
  return 'Unknown site'
}

/**
 * Capitalise first letter of string
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
