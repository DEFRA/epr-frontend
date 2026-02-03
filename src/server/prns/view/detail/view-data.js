import { getNoteTypeDisplayNames } from '#server/prns/helpers/get-note-type.js'

/**
 * Build view data for the PRN detail page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @returns {object}
 */
export function buildDetailViewData(
  request,
  { registration, organisationId, registrationId }
) {
  const { t: localise } = request
  const { noteType } = getNoteTypeDisplayNames(registration)

  const pageTitle = localise('prns:detail:pageTitle', { noteType })
  const basePrnsUrl = `/organisations/${organisationId}/registrations/${registrationId}/prns`

  return {
    pageTitle,
    heading: pageTitle,
    backUrl: basePrnsUrl,
    issuePrnText: localise('prns:detail:issuePrn', { noteType }),
    deletePrnText: localise('prns:detail:deletePrn', { noteType })
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
