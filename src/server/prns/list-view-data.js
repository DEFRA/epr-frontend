import { prnStatuses } from '#server/common/constants/statuses.js'

/**
 * PRN status display configuration
 * Maps API status values to display text and GOV.UK tag colour
 */
const PRN_STATUS = Object.freeze({
  [prnStatuses.awaitingAuthorisation]: {
    text: 'Awaiting authorisation',
    colour: 'blue'
  },
  [prnStatuses.awaitingAcceptance]: {
    text: 'Awaiting acceptance',
    colour: 'blue'
  },
  [prnStatuses.accepted]: { text: 'Accepted', colour: 'green' },
  [prnStatuses.rejected]: { text: 'Rejected', colour: 'red' },
  [prnStatuses.cancelled]: { text: 'Cancelled', colour: 'grey' },
  [prnStatuses.awaitingCancellation]: {
    text: 'Awaiting cancellation',
    colour: 'yellow'
  }
})

/**
 * Formats ISO date to UK readable format (e.g., '21 January 2026')
 * @param {string} isoDate - ISO 8601 date string
 * @returns {string} Formatted date string
 */
function formatDate(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Creates HTML for a status tag
 * @param {string} status - The status value
 * @returns {string} HTML string for the tag
 */
function createStatusTag(status) {
  const { text, colour } = PRN_STATUS[status]
  return `<strong class="govuk-tag govuk-tag--${colour}" style="max-width: none">${text}</strong>`
}

/**
 * Build view data for the PRN list page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {object|null} options.wasteBalance - Waste balance data
 * @param {Array} options.prns - Array of PRN objects from API
 * @returns {object}
 */
export function buildListViewData(
  request,
  { registration, organisationId, registrationId, wasteBalance, prns }
) {
  const { t: localise } = request
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`prns:list:${noteType}:pageTitle`)

  const selectLinkText = localise('prns:list:table:selectLink')
  const actionHeading = localise('prns:list:table:actionHeading')

  const tableHead = [
    { text: localise('prns:list:table:recipientHeading') },
    { text: localise('prns:list:table:dateHeading') },
    { text: localise('prns:list:table:tonnageHeading'), format: 'numeric' },
    { text: localise('prns:list:table:statusHeading') },
    { html: `<span class="govuk-visually-hidden">${actionHeading}</span>` }
  ]

  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/prns`

  const tableRows = prns
    .filter((prn) => prn.status === prnStatuses.awaitingAuthorisation)
    .map((prn) => [
      { text: prn.issuedToOrganisation.name },
      { text: formatDate(prn.createdAt) },
      { text: String(prn.tonnageValue), format: 'numeric' },
      { html: createStatusTag(prn.status) },
      {
        html: `<a href="${basePath}/${prn.prnNumber}">${selectLinkText} <span class="govuk-visually-hidden">${prn.issuedToOrganisation.name}</span></a>`
      }
    ])

  return {
    pageTitle,
    heading: pageTitle,
    backUrl: `/organisations/${organisationId}/registrations/${registrationId}`,
    createText: localise(`prns:list:${noteType}:createText`),
    createUrl: `/organisations/${organisationId}/registrations/${registrationId}/create-prn`,
    selectHeading: localise(`prns:list:${noteType}:selectHeading`),
    balanceHint: localise(`prns:list:${noteType}:balanceHint`),
    wasteBalance,
    table: {
      head: tableHead,
      rows: tableRows
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
