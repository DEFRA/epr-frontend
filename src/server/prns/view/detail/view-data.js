import { getPrnType } from '../../helpers/get-note-type.js'

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
  const prnType = getPrnType(registration)

  const pageTitle = localise(`prns:detail:${prnType}:pageTitle`)
  const basePrnsUrl = `/organisations/${organisationId}/registrations/${registrationId}/prns`

  return {
    pageTitle,
    heading: pageTitle,
    backUrl: basePrnsUrl,
    issuePrnText: localise(`prns:detail:${prnType}:issuePrn`),
    deletePrnText: localise(`prns:detail:${prnType}:deletePrn`)
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
