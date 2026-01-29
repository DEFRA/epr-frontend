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
    `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
  )

  const prnRows = prns.map((prn) => ({
    recipient: prn.recipient,
    createdAt: formatDate(prn.createdAt),
    tonnage: prn.tonnage,
    status: formatStatus(prn.status, localise),
    selectUrl: request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/prns/${prn.id}`
    )
  }))

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
    selectHeading: localise(`prns:list:${noteType}:selectHeading`),
    cancelHint: localise(`prns:list:${noteType}:cancelHint`),
    table: {
      headings: {
        recipient: localise('prns:list:table:recipientHeading'),
        createdAt: localise('prns:list:table:dateHeading'),
        tonnage: localise('prns:list:table:tonnageHeading'),
        status: localise('prns:list:table:statusHeading'),
        action: localise('prns:list:table:actionHeading')
      },
      rows: prnRows
    },
    selectText: localise('prns:list:table:selectText')
  }
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
