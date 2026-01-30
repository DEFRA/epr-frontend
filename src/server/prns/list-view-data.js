import { formatDateForDisplay } from '#server/common/helpers/format-date-for-display.js'

/**
 * Build view data for the PRN/PERN list page
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {{wasteProcessingType: string}} options.registration
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number, status: string}>} options.prns
 * @param {{availableAmount: number} | null} options.wasteBalance
 * @returns {object}
 */
export function buildListViewData(
  request,
  { organisationId, registrationId, registration, prns, wasteBalance }
) {
  const { t: localise } = request
  const isExporter = registration.wasteProcessingType === 'exporter'
  const noteType = isExporter ? 'perns' : 'prns'

  const backUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}`
  )

  const createUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/create`
  )

  const selectText = localise('prns:list:table:selectText')

  // Build rows in govukTable format: array of arrays of cell objects
  const dataRows = prns.map((prn) => {
    const viewUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prn.id}/view`
    )
    return [
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.createdAt) },
      { text: prn.tonnage },
      { html: buildStatusTagHtml(prn.status, localise) },
      { html: `<a href="${viewUrl}" class="govuk-link">${selectText}</a>` }
    ]
  })

  // Calculate total tonnage and add total row
  const totalTonnage = prns.reduce((sum, prn) => sum + prn.tonnage, 0)
  const totalRow = [
    {
      text: localise('prns:list:table:totalLabel'),
      classes: 'govuk-!-font-weight-bold'
    },
    { text: '' },
    { text: totalTonnage, classes: 'govuk-!-font-weight-bold' },
    { text: '' },
    { text: '' }
  ]
  const tableRows = dataRows.length > 0 ? [...dataRows, totalRow] : []

  return {
    pageTitle: localise(`prns:list:${noteType}:pageTitle`),
    heading: localise(`prns:list:${noteType}:pageTitle`),
    backUrl,
    createLink: {
      href: createUrl,
      text: localise(`prns:list:${noteType}:createLink`)
    },
    wasteBalance: {
      amount: wasteBalance?.availableAmount ?? 0,
      label: localise('prns:list:availableWasteBalance'),
      hint: localise(`prns:list:${noteType}:balanceHint`)
    },
    tabs: {
      awaitingAction: localise('prns:list:tabs:awaitingAction'),
      issued: localise('prns:list:tabs:issued')
    },
    cancelHint: localise(`prns:list:${noteType}:cancelHint`),
    awaitingAuthorisationHeading: localise(
      `prns:list:${noteType}:awaitingAuthorisationHeading`
    ),
    noPrnsText: localise('prns:list:noPrns'),
    noIssuedText: localise(`prns:list:${noteType}:noIssuedPrns`),
    table: {
      headings: {
        recipient: localise('prns:list:table:recipientHeading'),
        createdAt: localise('prns:list:table:dateHeading'),
        tonnage: localise('prns:list:table:tonnageHeading'),
        status: localise('prns:list:table:statusHeading'),
        action: localise('prns:list:table:actionHeading')
      },
      rows: tableRows
    }
  }
}

/**
 * Build govukTag HTML for status display
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
function buildStatusTagHtml(status, localise) {
  const statusText = formatStatus(status, localise)
  return `<strong class="govuk-tag govuk-tag--blue epr-tag--no-max-width">${statusText}</strong>`
}

/**
 * Format status for display
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
function formatStatus(status, localise) {
  const statusMap = {
    awaiting_authorisation: localise('prns:list:status:awaitingAuthorisation'),
    issued: localise('prns:list:status:issued'),
    cancelled: localise('prns:list:status:cancelled')
  }
  return statusMap[status] ?? status
}

/**
 * @import { Request } from '@hapi/hapi'
 */
