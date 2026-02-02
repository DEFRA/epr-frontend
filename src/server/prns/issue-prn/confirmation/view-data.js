import { getPrnType } from '../../helpers/get-note-type.js'

/**
 * Build view data for the PRN/PERN issuance confirmation page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {object} options.prnData
 * @returns {object}
 */
export function buildConfirmationViewData(
  request,
  { registration, organisationId, registrationId, prnData = {} }
) {
  const localise = (key) => request.t(`prns:confirmation:${key}`)
  const prnType = getPrnType(registration)
  const panelHeader = localise(`${prnType}:panelTitle`)
  const panelTitle = `${panelHeader} ${prnData.issuedToOrganisation?.name ?? ''}`
  const prnNumber = prnData.prnNumber ?? ''
  const basePrnsUrl = `/organisations/${organisationId}/registrations/${registrationId}/prns`
  const createPrnUrl = `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
  const returnToHomeUrl = `/organisations/${organisationId}`

  return {
    pageTitle: panelTitle,
    panelTitle,
    prnNumberLabel: localise(`${prnType}:prnNumberLabel`),
    prnNumber,
    viewPrnText: localise(`${prnType}:viewPrn`),
    viewPrnUrl: `${basePrnsUrl}/${prnNumber}`,
    createPrnText: localise(`${prnType}:createPrn`),
    createPrnUrl,
    managePrnsText: localise(`${prnType}:managePrns`),
    managePrnsUrl: basePrnsUrl,
    returnToHomeText: localise('returnToHome'),
    returnToHomeUrl
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
