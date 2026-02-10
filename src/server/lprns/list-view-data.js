import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { formatDateForDisplay } from './helpers/format-date-for-display.js'
import { getStatusConfig } from '#server/lprns/helpers/get-status-config.js'

/**
 * Build view data for the PRN/PERN list page
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {{wasteProcessingType: string}} options.registration
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number, status: string}>} options.prns
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number}>} [options.cancellationPrns]
 * @param {Array<{id: string, prnNumber: string, recipient: string, issuedAt: string, status: string}>} [options.issuedPrns]
 * @param {boolean} options.hasCreatedPrns
 * @param {{availableAmount: number} | null} options.wasteBalance
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
    cancellationPrns = [],
    issuedPrns = [],
    hasCreatedPrns,
    wasteBalance
  }
) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

  const backUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}`
  )

  const createUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
  )

  const table = buildAwaitingActionTable(request, {
    organisationId,
    registrationId,
    accreditationId,
    prns,
    localise
  })

  const cancellationTable = buildAwaitingCancellationTable(request, {
    organisationId,
    registrationId,
    accreditationId,
    cancellationPrns,
    localise
  })

  const issuedTable = buildIssuedTable(request, {
    organisationId,
    registrationId,
    accreditationId,
    issuedPrns,
    localise,
    noteType
  })

  return {
    pageTitle: localise('lprns:list:pageTitle', { noteTypePlural }),
    heading: localise('lprns:list:pageTitle', { noteTypePlural }),
    backUrl,
    createLink: {
      href: createUrl,
      text: localise('lprns:list:createLink', { noteType })
    },
    wasteBalance: {
      amount: wasteBalance?.availableAmount ?? 0,
      label: localise('lprns:list:availableWasteBalance'),
      hint: localise('lprns:list:balanceHint', { noteTypePlural })
    },
    hasCreatedPrns,
    selectHeading: localise('lprns:list:selectHeading', { noteType }),
    noPrnsCreatedText: localise('lprns:list:noPrnsCreated', { noteTypePlural }),
    tabs: {
      awaitingAction: localise('lprns:list:tabs:awaitingAction'),
      issued: localise('lprns:list:tabs:issued')
    },
    cancelHint: localise('lprns:list:cancelHint', { noteType }),
    awaitingAuthorisationHeading: localise(
      'lprns:list:awaitingAuthorisationHeading',
      { noteTypePlural }
    ),
    awaitingCancellationHeading: localise(
      'lprns:list:awaitingCancellationHeading',
      { noteTypePlural }
    ),
    noPrnsText: localise('lprns:list:noPrns'),
    noIssuedText: localise('lprns:list:noIssuedPrns', { noteTypePlural }),
    table,
    cancellationTable,
    issuedHeading: localise('lprns:list:issuedHeading', { noteTypePlural }),
    issuedTable
  }
}

/**
 * Build awaiting action table with headings and data rows
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number, status: string}>} options.prns
 * @param {(key: string) => string} options.localise
 * @returns {{headings: object, rows: Array<Array<{text?: string, html?: string, classes?: string}>>}}
 */
function buildAwaitingActionTable(
  request,
  { organisationId, registrationId, accreditationId, prns, localise }
) {
  const headings = {
    recipient: localise('lprns:list:table:recipientHeading'),
    createdAt: localise('lprns:list:table:dateHeading'),
    tonnage: localise('lprns:list:table:tonnageHeading'),
    status: localise('lprns:list:table:statusHeading'),
    action: localise('lprns:list:table:actionHeading')
  }

  const selectText = localise('lprns:list:table:selectText')

  const dataRows = prns.map((prn) => {
    const actionUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prn.id}`
    )
    return [
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.createdAt) },
      { text: prn.tonnage },
      { html: buildStatusTagHtml(prn.status, localise) },
      { html: `<a href="${actionUrl}" class="govuk-link">${selectText}</a>` }
    ]
  })

  if (dataRows.length === 0) {
    return { headings, rows: [] }
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

  return { headings, rows: [...dataRows, totalRow] }
}

/**
 * Build awaiting cancellation table with headings and data rows
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {Array<{id: string, recipient: string, createdAt: string, tonnage: number}>} options.cancellationPrns
 * @param {(key: string) => string} options.localise
 * @returns {{headings: object, rows: Array<Array<{text?: string, html?: string, classes?: string}>>}}
 */
function buildAwaitingCancellationTable(
  request,
  {
    organisationId,
    registrationId,
    accreditationId,
    cancellationPrns,
    localise
  }
) {
  const headings = {
    recipient: localise('lprns:list:table:recipientHeading'),
    createdAt: localise('lprns:list:table:dateHeading'),
    tonnage: localise('lprns:list:table:tonnageHeading'),
    status: localise('lprns:list:table:statusHeading'),
    action: localise('lprns:list:table:actionHeading')
  }

  const selectText = localise('lprns:list:table:selectText')

  const dataRows = cancellationPrns.map((prn) => {
    const actionUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prn.id}`
    )
    return [
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.createdAt) },
      { text: prn.tonnage },
      { text: '' },
      { html: `<a href="${actionUrl}" class="govuk-link">${selectText}</a>` }
    ]
  })

  if (dataRows.length === 0) {
    return { headings, rows: [] }
  }

  const totalTonnage = cancellationPrns.reduce(
    (sum, prn) => sum + prn.tonnage,
    0
  )
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

  return { headings, rows: [...dataRows, totalRow] }
}

/**
 * Build issued table with headings and data rows
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {string} options.accreditationId
 * @param {Array<{id: string, prnNumber: string, recipient: string, issuedAt: string, status: string}>} options.issuedPrns
 * @param {(key: string, params?: object) => string} options.localise
 * @param {string} options.noteType
 * @returns {{headings: object, rows: Array<Array<{text?: string, html?: string}>>}}
 */
function buildIssuedTable(
  request,
  {
    organisationId,
    registrationId,
    accreditationId,
    issuedPrns,
    localise,
    noteType
  }
) {
  const headings = {
    prnNumber: localise('lprns:list:issuedTable:noteNumberHeading', {
      noteType
    }),
    recipient: localise('lprns:list:issuedTable:recipientHeading'),
    dateIssued: localise('lprns:list:issuedTable:dateIssuedHeading'),
    status: localise('lprns:list:issuedTable:statusHeading'),
    action: localise('lprns:list:issuedTable:actionHeading')
  }

  const selectText = localise('lprns:list:issuedTable:selectText')

  const rows = issuedPrns.map((prn) => {
    const viewUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prn.id}/view`
    )
    return [
      { text: prn.prnNumber },
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.issuedAt) },
      { html: buildStatusTagHtml(prn.status, localise) },
      {
        html: `<a href="${viewUrl}" class="govuk-link" target="_blank" rel="noopener noreferrer">${selectText}</a>`
      }
    ]
  })

  return { headings, rows }
}

/**
 * Build govukTag HTML for status display
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
function buildStatusTagHtml(status, localise) {
  const statusConfig = getStatusConfig(status, localise)
  return `<strong class="govuk-tag ${statusConfig.class}">${statusConfig.text}</strong>`
}
