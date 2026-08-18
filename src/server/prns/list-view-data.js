import { hasWriteScope } from '#server/auth/scopes.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { getStatusConfig } from '#server/prns/helpers/get-status-config.js'

/**
 * @param {{
 *   t: (key: string, params?: object) => string,
 *   localiseUrl: (url: string) => string,
 *   auth: { credentials?: { scope?: string[] } | null }
 * }} request
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   registration: { wasteProcessingType: string },
 *   prns: object[],
 *   cancellationPrns?: object[],
 *   issuedPrns?: object[],
 *   cancelledPrns?: object[],
 *   hasCreatedPrns?: boolean,
 *   wasteBalance?: { availableAmount?: number } | null
 * }} options
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
    cancelledPrns = [],
    hasCreatedPrns,
    wasteBalance
  }
) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)
  const canWrite = hasWriteScope(request.auth.credentials)
  const routeBase = `/organisations/${organisationId}/registrations/${registrationId}`

  const buildAwaiting = (prnList) =>
    buildAwaitingTable(request, {
      organisationId,
      registrationId,
      accreditationId,
      prns: prnList,
      localise,
      canWrite
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

/**
 * The awaiting-action table. Its action link opens the page that issues or
 * cancels a note, so a session holding no write scope is sent to the note's
 * read page instead. An awaiting note appears in no other table, so an empty
 * cell would leave that session able to see the note listed and unable to open
 * it. The link is assembled here rather than in the template, so the template
 * scan that hides write controls cannot see it and the decision has to be made
 * at this call site.
 * @param {{ localiseUrl: (url: string) => string }} request
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   prns: Array<{
 *     id: string,
 *     recipient: string,
 *     createdAt: string,
 *     tonnage?: number | null,
 *     status: string
 *   }>,
 *   localise: (key: string, params?: object) => string,
 *   canWrite: boolean
 * }} options
 */
function buildAwaitingTable(
  request,
  { organisationId, registrationId, accreditationId, prns, localise, canWrite }
) {
  const headings = {
    recipient: localise('prns:list:table:recipientHeading'),
    createdAt: localise('prns:list:table:dateHeading'),
    tonnage: localise('prns:list:table:tonnageHeading'),
    status: localise('prns:list:table:statusHeading'),
    action: localise('prns:list:table:actionHeading')
  }

  const selectText = localise('prns:list:table:selectText')
  const viewText = localise('prns:list:table:viewText')

  const dataRows = prns.map((prn) => {
    const notePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prn.id}`
    const actionUrl = request.localiseUrl(notePath)
    const viewUrl = request.localiseUrl(`${notePath}/view`)
    return [
      { text: prn.recipient },
      { text: formatDate(prn.createdAt) },
      { text: prn.tonnage },
      { html: buildStatusTagHtml(prn.status, localise) },
      canWrite
        ? {
            html: `<a href="${actionUrl}" class="govuk-link">${selectText}</a>`
          }
        : { html: `<a href="${viewUrl}" class="govuk-link">${viewText}</a>` }
    ]
  })

  if (dataRows.length === 0) {
    return { headings, rows: [] }
  }

  const totalTonnage = prns.reduce((sum, prn) => sum + (prn.tonnage ?? 0), 0)
  const totalRow = [
    {
      text: localise('prns:list:table:totalLabel'),
      classes: cssClasses.fontWeight.bold
    },
    { text: '' },
    { text: totalTonnage, classes: cssClasses.fontWeight.bold },
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
      { text: formatDate(prn.issuedAt) },
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
      classes: cssClasses.fontWeight.bold
    },
    { text: '' },
    { text: '' },
    { text: totalTonnage, classes: cssClasses.fontWeight.bold },
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
