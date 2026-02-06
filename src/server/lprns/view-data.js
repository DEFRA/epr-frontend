import { NOTES_MAX_LENGTH } from './constants.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'

/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {{wasteProcessingType: string, material: string, nation?: string, glassRecyclingProcess?: string[]}} options.registration
 * @param {Array<{value: string, text: string}>} options.recipients
 * @returns {object}
 */
export function buildCreatePrnViewData(
  request,
  { organisationId, recipients, registration, registrationId }
) {
  const { t: localise } = request
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`lprns:${noteType}:pageTitle`)
  const material = getLumpyDisplayMaterial(registration)

  return {
    pageTitle,
    heading: pageTitle,
    backUrl: `/organisations/${organisationId}/registrations/${registrationId}`,
    material: {
      label: localise('lprns:materialLabel'),
      value: material
    },
    hiddenFields: {
      material: registration.material,
      nation: registration.nation || 'england',
      wasteProcessingType: registration.wasteProcessingType
    },
    tonnage: {
      label: localise(`lprns:${noteType}:tonnageLabel`),
      hint: localise('lprns:tonnageHint'),
      suffix: localise('lprns:tonnageSuffix')
    },
    recipient: {
      label: localise(`lprns:${noteType}:recipientLabel`),
      hint: localise('lprns:recipientHint'),
      items: [
        { value: '', text: localise('lprns:selectOption') },
        ...recipients
      ]
    },
    help: {
      summary: localise('lprns:helpSummary'),
      intro: localise(`lprns:${noteType}:helpIntro`),
      listIntro: localise('lprns:helpListIntro'),
      listItemOne: localise('lprns:helpListItemOne'),
      listItemTwo: localise('lprns:helpListItemTwo')
    },
    notes: {
      label: localise('lprns:notesLabel'),
      hint: localise(`lprns:${noteType}:notesHint`),
      maxLength: NOTES_MAX_LENGTH
    },
    submitButton: {
      text: localise(`lprns:${noteType}:submitButton`)
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
