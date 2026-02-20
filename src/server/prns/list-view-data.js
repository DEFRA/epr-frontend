import { cssClasses } from '#server/common/constants/css-classes.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { formatDateForDisplay } from './helpers/format-date-for-display.js'
import { getStatusConfig } from '#server/prns/helpers/get-status-config.js'

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
    cancelledPrns = [],
    hasCreatedPrns,
    wasteBalance
  }
) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)
  const routeBase = `/organisations/${organisationId}/registrations/${registrationId}`

  const buildAwaiting = (prnList) =>
    buildAwaitingTable(request, {
      organisationId,
      registrationId,
      accreditationId,
      prns: prnList,
      localise
    })

  const buildDetail = (prnList, i18nPrefix) =>
    buildDetailTable(request, {
      organisationId,
      registrationId,
      accreditationId,
      prns: prnList,
      localise,
      noteType,
      i18nPrefix
    })

  return {
    ...buildListLabels(localise, { noteType, noteTypePlural }),
    backUrl: request.localiseUrl(routeBase),
    createLink: {
      href: request.localiseUrl(
        `${routeBase}/accreditations/${accreditationId}/packaging-recycling-notes/create`
      ),
      text: localise('prns:list:createLink', { noteType })
    },
    wasteBalance: {
      amount: wasteBalance?.availableAmount ?? 0,
      label: localise('prns:list:availableWasteBalance'),
      hint: localise('prns:list:balanceHint', { noteTypePlural })
    },
    hasCreatedPrns,
    table: buildAwaiting(prns),
    cancellationTable: buildAwaiting(cancellationPrns),
    issuedTable: buildDetail(issuedPrns, 'issuedTable'),
    cancelledTable: buildDetail(cancelledPrns, 'cancelledTable')
  }
}

function buildListLabels(localise, { noteType, noteTypePlural }) {
  return {
    pageTitle: localise('prns:list:pageTitle', { noteTypePlural }),
    heading: localise('prns:list:pageTitle', { noteTypePlural }),
    selectHeading: localise('prns:list:selectHeading', { noteType }),
    noPrnsCreatedText: localise('prns:list:noPrnsCreated', { noteTypePlural }),
    tabs: {
      awaitingAction: localise('prns:list:tabs:awaitingAction'),
      issued: localise('prns:list:tabs:issued'),
      cancelled: localise('prns:list:tabs:cancelled')
    },
    cancelHint: localise('prns:list:cancelHint', { noteType }),
    awaitingAuthorisationHeading: localise(
      'prns:list:awaitingAuthorisationHeading',
      { noteTypePlural }
    ),
    awaitingCancellationHeading: localise(
      'prns:list:awaitingCancellationHeading',
      { noteTypePlural }
    ),
    noPrnsText: localise('prns:list:noPrns'),
    noIssuedText: localise('prns:list:noIssuedPrns', { noteTypePlural }),
    issuedHeading: localise('prns:list:issuedHeading', { noteTypePlural }),
    cancelledHeading: localise('prns:list:cancelledHeading', {
      noteTypePlural
    }),
    noCancelledText: localise('prns:list:noCancelledPrns', { noteTypePlural })
  }
}

function buildAwaitingTable(
  request,
  { organisationId, registrationId, accreditationId, prns, localise }
) {
  const headings = {
    recipient: localise('prns:list:table:recipientHeading'),
    createdAt: localise('prns:list:table:dateHeading'),
    tonnage: localise('prns:list:table:tonnageHeading'),
    status: localise('prns:list:table:statusHeading'),
    action: localise('prns:list:table:actionHeading')
  }

  const selectText = localise('prns:list:table:selectText')

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

  const totalTonnage = prns.reduce((sum, prn) => sum + (prn.tonnage ?? 0), 0)
  const totalRow = [
    {
      text: localise('prns:list:table:totalLabel'),
      classes: cssClasses.fontWeightBold
    },
    { text: '' },
    { text: totalTonnage, classes: cssClasses.fontWeightBold },
    { text: '' },
    { text: '' }
  ]

  return { headings, rows: [...dataRows, totalRow] }
}

function buildDetailTable(
  request,
  {
    organisationId,
    registrationId,
    accreditationId,
    prns,
    localise,
    noteType,
    i18nPrefix
  }
) {
  const headings = {
    prnNumber: localise(`prns:list:${i18nPrefix}:noteNumberHeading`, {
      noteType
    }),
    recipient: localise(`prns:list:${i18nPrefix}:recipientHeading`),
    dateIssued: localise(`prns:list:${i18nPrefix}:dateIssuedHeading`),
    tonnage: localise(`prns:list:${i18nPrefix}:tonnageHeading`),
    status: localise(`prns:list:${i18nPrefix}:statusHeading`),
    action: localise(`prns:list:${i18nPrefix}:actionHeading`)
  }

  const selectText = localise(`prns:list:${i18nPrefix}:selectText`)

  const rows = prns.map((prn) => {
    const viewUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prn.id}/view`
    )
    return [
      { text: prn.prnNumber },
      { text: prn.recipient },
      { text: formatDateForDisplay(prn.issuedAt) },
      { text: prn.tonnage ?? 0 },
      { html: buildStatusTagHtml(prn.status, localise) },
      {
        html: `<a href="${viewUrl}" class="govuk-link" target="_blank" rel="noopener noreferrer">${selectText}</a>`
      }
    ]
  })

  if (rows.length === 0) {
    return { headings, rows: [] }
  }

  const totalTonnage = prns.reduce((sum, prn) => sum + (prn.tonnage ?? 0), 0)
  const totalRow = [
    {
      text: localise('prns:list:table:totalLabel'),
      classes: cssClasses.fontWeightBold
    },
    { text: '' },
    { text: '' },
    { text: totalTonnage, classes: cssClasses.fontWeightBold },
    { text: '' },
    { text: '' }
  ]

  return { headings, rows: [...rows, totalRow] }
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
