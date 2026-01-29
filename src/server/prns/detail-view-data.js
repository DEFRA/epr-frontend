/**
 * Build view data for the PRN detail page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @returns {object}
 */
export function buildDetailViewData(request, { registration }) {
  const { t: localise } = request
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`prns:detail:${noteType}:pageTitle`)

  return {
    pageTitle,
    heading: pageTitle
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
