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

  const prnRows = prns.map((prn) => ({
    recipient: prn.recipient,
    createdAt: formatDate(prn.createdAt),
    tonnage: prn.tonnage,
    status: formatStatus(prn.status, localise),
    selectUrl: request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prn.id}/view`
    )
  }))

  const tableHeadings = {
    recipient: localise('prns:list:table:recipientHeading'),
    createdAt: localise('prns:list:table:dateHeading'),
    tonnage: localise('prns:list:table:tonnageHeading'),
    status: localise('prns:list:table:statusHeading'),
    action: localise('prns:list:table:actionHeading')
  }

  const selectText = localise('prns:list:table:selectText')
  const cancelHint = localise(`prns:list:${noteType}:cancelHint`)
  const noPrnsText = localise('prns:list:noPrns')
  const awaitingAuthorisationHeading = localise(
    `prns:list:${noteType}:awaitingAuthorisationHeading`
  )

  const awaitingActionPanel = buildAwaitingActionPanelHtml(
    prnRows,
    tableHeadings,
    selectText,
    cancelHint,
    noPrnsText,
    awaitingAuthorisationHeading
  )

  const issuedPanel = buildIssuedPanelHtml(
    localise(`prns:list:${noteType}:noIssuedPrns`)
  )

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
    awaitingActionPanel,
    issuedPanel
  }
}

/**
 * Build HTML for the awaiting action tab panel.
 * SECURITY: All string content must be escaped with escapeHtml() to prevent XSS.
 * The tonnage field is a number and does not require escaping.
 * @param {Array<{recipient: string, createdAt: string, tonnage: number, status: string, selectUrl: string}>} rows
 * @param {{recipient: string, createdAt: string, tonnage: string, status: string, action: string}} headings
 * @param {string} selectText
 * @param {string} cancelHint
 * @param {string} noPrnsText
 * @param {string} awaitingAuthorisationHeading
 * @returns {string}
 */
function buildAwaitingActionPanelHtml(
  rows,
  headings,
  selectText,
  cancelHint,
  noPrnsText,
  awaitingAuthorisationHeading
) {
  const insetHtml = `<div class="govuk-inset-text">${escapeHtml(cancelHint)}</div>`

  if (rows.length === 0) {
    return `${insetHtml}<p class="govuk-body">${escapeHtml(noPrnsText)}</p>`
  }

  const tableRowsHtml = rows
    .map(
      (row) => `
      <tr class="govuk-table__row">
        <td class="govuk-table__cell">${escapeHtml(row.recipient)}</td>
        <td class="govuk-table__cell">${escapeHtml(row.createdAt)}</td>
        <td class="govuk-table__cell">${row.tonnage}</td>
        <td class="govuk-table__cell">${escapeHtml(row.status)}</td>
        <td class="govuk-table__cell">
          <a href="${escapeHtml(row.selectUrl)}" class="govuk-link">${escapeHtml(selectText)}</a>
        </td>
      </tr>`
    )
    .join('')

  return `${insetHtml}
    <h2 class="govuk-heading-m">${escapeHtml(awaitingAuthorisationHeading)}</h2>
    <table class="govuk-table">
      <thead class="govuk-table__head">
        <tr class="govuk-table__row">
          <th scope="col" class="govuk-table__header">${escapeHtml(headings.recipient)}</th>
          <th scope="col" class="govuk-table__header">${escapeHtml(headings.createdAt)}</th>
          <th scope="col" class="govuk-table__header">${escapeHtml(headings.tonnage)}</th>
          <th scope="col" class="govuk-table__header">${escapeHtml(headings.status)}</th>
          <th scope="col" class="govuk-table__header">${escapeHtml(headings.action)}</th>
        </tr>
      </thead>
      <tbody class="govuk-table__body">
        ${tableRowsHtml}
      </tbody>
    </table>`
}

/**
 * Build HTML for the issued tab panel
 * @param {string} noIssuedText
 * @returns {string}
 */
function buildIssuedPanelHtml(noIssuedText) {
  return `<p class="govuk-body">${escapeHtml(noIssuedText)}</p>`
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return String(text).replace(/[&<>"']/g, (char) => htmlEscapes[char])
}

/**
 * Format date for display
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
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
