import { getNoteTypeDisplayNames } from '#server/prns/helpers/get-note-type.js'
import { NOTES_MAX_LENGTH } from './constants.js'

/** @import {WasteOrganisation} from '#server/common/helpers/waste-organisations/types.js' */

/**
 * @typedef {object} CreateViewDataOptions
 * @property {{wasteProcessingType: string}} registration
 * @property {WasteOrganisation[]} recipients
 * @property {string} organisationId
 * @property {string} registrationId
 * @property {Record<string, {text: string}>} [errors]
 * @property {{tonnage?: string, recipient?: string, notes?: string}} [values]
 */

/**
 * Transform waste organisation object to option strings
 * @param {WasteOrganisation[]} recipients
 * @returns {Array<{value: string, text: string}>}
 */
function mapRecipientOptions(recipients) {
  return recipients.map((recipient) => {
    const name = recipient.tradingName || recipient.name
    const address = Object.values(recipient.address).filter(Boolean).join(', ')

    return {
      value: recipient.id,
      text: `${name}, ${address}`
    }
  })
}

/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {CreateViewDataOptions} options
 * @returns {object}
 */
export function buildCreateViewData(
  request,
  { errors, organisationId, recipients, registration, registrationId, values }
) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

  const pageTitle = localise('prns:create:pageTitle', { noteType })

  const recipientItems = [
    { value: '', text: localise('prns:selectOption') },
    ...mapRecipientOptions(recipients)
  ].map((item) => ({
    ...item,
    selected: values?.recipient === item.value
  }))

  const backUrl = `/organisations/${organisationId}/registrations/${registrationId}`

  const viewData = {
    backUrl,
    pageTitle,
    heading: pageTitle,
    tonnage: {
      label: localise('prns:create:tonnageLabel', { noteType }),
      hint: localise('prns:create:tonnageHint'),
      suffix: localise('prns:create:tonnageSuffix'),
      value: values?.tonnage ?? '',
      errorMessage: errors?.tonnage
    },
    recipient: {
      label: localise('prns:create:recipientLabel', { noteType }),
      hint: localise('prns:create:recipientHint'),
      items: recipientItems,
      errorMessage: errors?.recipient
    },
    help: {
      summary: localise('prns:create:helpSummary'),
      intro: localise('prns:create:help:intro', { noteTypePlural }),
      listIntro: localise('prns:create:help:listIntro'),
      listItemOne: localise('prns:create:help:listItemOne'),
      listItemTwo: localise('prns:create:help:listItemTwo')
    },
    notes: {
      label: localise('prns:create:notesLabel'),
      hint: localise('prns:create:notesHint', { noteType }),
      maxLength: NOTES_MAX_LENGTH,
      value: values?.notes ?? '',
      errorMessage: errors?.notes
    }
  }

  if (errors) {
    viewData.errorSummary = Object.entries(errors).map(
      ([fieldName, error]) => ({
        text: error.text,
        href: `#${fieldName}`
      })
    )
  }

  return viewData
}

/**
 * @import { Request } from '@hapi/hapi'
 */
