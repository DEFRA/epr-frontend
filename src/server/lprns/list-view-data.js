import { formatDateForDisplay } from './helpers/format-date-for-display.js'

/**
 * Build view data for the PRN/PERN list page
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {{wasteProcessingType: string}} options.registration
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number, status: string}>} options.prns
 * @param {Array<{id: string, prnNumber: string, recipient: string, issuedAt: string, status: string}>} [options.issuedPrns]
 * @param {boolean} options.hasCreatedPrns
 * @param {{availableAmount: number} | null} options.wasteBalance
 * @param {boolean} options.hasIssuedPrns
 * @returns {object}
 */
export function buildListViewData(
  request,
  {
    organisationId,
    registrationId,
    accreditationId,
    registration,
    prns,
    issuedPrns = [],
    hasCreatedPrns,
    wasteBalance,
    hasIssuedPrns
  }
) {
  const { t: localise } = request
  const isExporter = registration.wasteProcessingType === 'exporter'
  const noteType = isExporter ? 'perns' : 'prns'

  const backUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}`
  )

  const createUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create`
  )

  const tableRows = buildTableRows(request, {
    organisationId,
    registrationId,
    accreditationId,
    prns,
    localise
  })

  const issuedTableRows = buildIssuedTableRows(request, {
    organisationId,
    registrationId,
    accreditationId,
    issuedPrns,
    localise
  })

  return {
    pageTitle: localise(`lprns:list:${noteType}:pageTitle`),
    heading: localise(`lprns:list:${noteType}:pageTitle`),
    showTabs: hasIssuedPrns === true,
    backUrl,
    createLink: {
      href: createUrl,
      text: localise(`lprns:list:${noteType}:createLink`)
    },
    wasteBalance: {
      amount: wasteBalance?.availableAmount ?? 0,
      label: localise('lprns:list:availableWasteBalance'),
      hint: localise(`lprns:list:${noteType}:balanceHint`)
    },
    hasCreatedPrns,
    selectHeading: localise(`lprns:list:${noteType}:selectHeading`),
    noPrnsCreatedText: localise(`lprns:list:${noteType}:noPrnsCreated`),
    tabs: {
      awaitingAction: localise('lprns:list:tabs:awaitingAction'),
      issued: localise('lprns:list:tabs:issued')
    },
    cancelHint: localise(`lprns:list:${noteType}:cancelHint`),
    awaitingAuthorisationHeading: localise(
      `lprns:list:${noteType}:awaitingAuthorisationHeading`
    ),
    noPrnsText: localise('lprns:list:noPrns'),
    noIssuedText: localise(`lprns:list:${noteType}:noIssuedPrns`),
    table: {
      headings: {
        recipient: localise('lprns:list:table:recipientHeading'),
        createdAt: localise('lprns:list:table:dateHeading'),
        tonnage: localise('lprns:list:table:tonnageHeading'),
        status: localise('lprns:list:table:statusHeading'),
        action: localise('lprns:list:table:actionHeading')
      },
      rows: tableRows
    },
    issuedHeading: localise(`lprns:list:${noteType}:issuedHeading`),
    issuedTable: {
      headings: {
        prnNumber: localise('lprns:list:issuedTable:prnNumberHeading'),
        recipient: localise('lprns:list:issuedTable:recipientHeading'),
        dateIssued: localise('lprns:list:issuedTable:dateIssuedHeading'),
        status: localise('lprns:list:issuedTable:statusHeading'),
        action: localise('lprns:list:issuedTable:actionHeading')
      },
      rows: issuedTableRows
    }
  }
}

/**
 * Build table rows including data rows and total row
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number, status: string}>} options.prns
 * @param {(key: string) => string} options.localise
 * @returns {Array<Array<{text?: string, html?: string, classes?: string}>>}
 */
function buildTableRows(
  request,
  { organisationId, registrationId, accreditationId, prns, localise }
) {
  const selectText = localise('lprns:list:table:selectText')

  const dataRows = prns.map((prn) => {
    const viewUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prn.id}/view`
    )
    return [
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.createdAt) },
      { text: prn.tonnage },
      { html: buildStatusTagHtml(prn.status, localise) },
      { html: `<a href="${viewUrl}" class="govuk-link">${selectText}</a>` }
    ]
  })

  if (dataRows.length === 0) {
    return []
  }

  const totalTonnage = prns.reduce((sum, prn) => sum + prn.tonnage, 0)
  const totalRow = [
    {
      text: localise('lprns:list:table:totalLabel'),
      classes: 'govuk-!-font-weight-bold'
    },
    { text: '' },
    { text: totalTonnage, classes: 'govuk-!-font-weight-bold' },
    { text: '' },
    { text: '' }
  ]

  return [...dataRows, totalRow]
}

/**
 * Build issued table rows
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {Array<{id: string, prnNumber: string, recipient: string, issuedAt: string, status: string}>} options.issuedPrns
 * @param {(key: string) => string} options.localise
 * @returns {Array<Array<{text?: string, html?: string}>>}
 */
function buildIssuedTableRows(
  request,
  { organisationId, registrationId, accreditationId, issuedPrns, localise }
) {
  const selectText = localise('lprns:list:issuedTable:selectText')

  return issuedPrns.map((prn) => {
    const viewUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prn.id}/view`
    )
    return [
      { text: prn.prnNumber },
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.issuedAt) },
      { html: buildStatusTagHtml(prn.status, localise) },
      { html: `<a href="${viewUrl}" class="govuk-link">${selectText}</a>` }
    ]
  })
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
    awaiting_authorisation: localise('lprns:list:status:awaitingAuthorisation'),
    awaiting_acceptance: localise('lprns:list:status:awaitingAcceptance'),
    issued: localise('lprns:list:status:issued'),
    cancelled: localise('lprns:list:status:cancelled')
  }
  return statusMap[status] ?? status
}

/**
 * @import { Request } from '@hapi/hapi'
 */
