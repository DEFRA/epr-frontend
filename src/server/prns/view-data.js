import { getPrnType } from './helpers/get-note-type.js'

/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {Array<{value: string, text: string}>} options.recipients
 * @returns {object}
 */
export function buildCreatePrnViewData(request, { registration, recipients }) {
  const { t: localise } = request
  const prnType = getPrnType(registration)

  const pageTitle = localise(`prns:${prnType}:pageTitle`)

  return {
    pageTitle,
    heading: pageTitle,
    tonnage: {
      label: localise(`prns:${prnType}:tonnageLabel`),
      hint: localise('prns:tonnageHint'),
      suffix: localise('prns:tonnageSuffix')
    },
    recipient: {
      label: localise(`prns:${prnType}:recipientLabel`),
      hint: localise('prns:recipientHint'),
      items: [{ value: '', text: 'Select an option' }, ...recipients]
    },
    help: {
      summary: localise('prns:helpSummary'),
      text: localise(`prns:${prnType}:helpText`)
    },
    notes: {
      label: localise('prns:notesLabel'),
      hint: localise(`prns:${prnType}:notesHint`)
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
