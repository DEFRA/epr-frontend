/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {Array<{value: string, text: string}>} options.recipients
 * @returns {object}
 */
export function buildCreateViewData(request, { registration, recipients }) {
  const { t: localise } = request
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`prns:create:${noteType}:pageTitle`)

  return {
    pageTitle,
    heading: pageTitle,
    tonnage: {
      label: localise(`prns:create:${noteType}:tonnageLabel`),
      hint: localise('prns:create:tonnageHint'),
      suffix: localise('prns:create:tonnageSuffix')
    },
    recipient: {
      label: localise(`prns:create:${noteType}:recipientLabel`),
      hint: localise('prns:create:recipientHint'),
      items: [{ value: '', text: localise('prns:selectOption') }, ...recipients]
    },
    help: {
      summary: localise('prns:create:helpSummary'),
      text: localise(`prns:create:${noteType}:helpText`)
    },
    notes: {
      label: localise('prns:create:notesLabel'),
      hint: localise(`prns:create:${noteType}:notesHint`)
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
