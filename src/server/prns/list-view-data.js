/**
 * PRN status display configuration
 * Maps API status values to display text and GOV.UK tag colour
 */
const PRN_STATUS = Object.freeze({
  awaiting_authorisation: { text: 'Awaiting authorisation', colour: 'blue' },
  awaiting_acceptance: { text: 'Awaiting acceptance', colour: 'blue' },
  accepted: { text: 'Accepted', colour: 'green' },
  rejected: { text: 'Rejected', colour: 'red' },
  cancelled: { text: 'Cancelled', colour: 'grey' },
  awaiting_cancellation: { text: 'Awaiting cancellation', colour: 'yellow' }
})

const DEFAULT_STATUS = Object.freeze({ text: 'Unknown', colour: 'grey' })

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
  const { text, colour } = PRN_STATUS[status] || DEFAULT_STATUS
  return `<strong class="govuk-tag govuk-tag--${colour}">${text}</strong>`
}

/**
 * Build view data for the PRN list page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {Array} options.prns - Array of PRN objects from API
 * @param {object|null} options.wasteBalance - Waste balance data
 * @returns {object}
 */
export function buildListViewData(
  request,
  { registration, prns, wasteBalance }
) {
  const { t: localise } = request
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`prns:list:${noteType}:pageTitle`)

  const tableHead = [
    { text: localise('prns:list:table:recipientHeading') },
    { text: localise('prns:list:table:dateHeading') },
    { text: localise('prns:list:table:tonnageHeading'), format: 'numeric' },
    { text: localise('prns:list:table:statusHeading') }
  ]

  const tableRows = prns.map((prn) => [
    { text: prn.issuedToOrganisation.name },
    { text: formatDate(prn.createdAt) },
    { text: String(prn.tonnageValue), format: 'numeric' },
    { html: createStatusTag(prn.status) }
  ])

  return {
    pageTitle,
    heading: pageTitle,
    selectHeading: localise(`prns:list:${noteType}:selectHeading`),
    balanceHint: localise(`prns:list:${noteType}:balanceHint`),
    cancelHint: localise(`prns:list:${noteType}:cancelHint`),
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
