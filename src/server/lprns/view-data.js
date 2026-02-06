import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
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
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

  const pageTitle = localise('lprns:create:pageTitle', { noteType })
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
      label: localise('lprns:create:tonnageLabel', { noteType }),
      hint: localise('lprns:tonnageHint'),
      suffix: localise('lprns:tonnageSuffix')
    },
    recipient: {
      label: localise('lprns:create:recipientLabel', { noteType }),
      hint: localise('lprns:recipientHint'),
      items: [
        { value: '', text: localise('lprns:selectOption') },
        ...recipients
      ]
    },
    help: {
      summary: localise('lprns:help:summary'),
      intro: localise('lprns:create:helpIntro', { noteTypePlural }),
      listIntro: localise('lprns:help:listIntro'),
      listItemOne: localise('lprns:help:listItemOne'),
      listItemTwo: localise('lprns:help:listItemTwo')
    },
    notes: {
      label: localise('lprns:notesLabel'),
      hint: localise('lprns:create:notesHint', { noteType }),
      maxLength: NOTES_MAX_LENGTH
    },
    submitButton: {
      text: localise('lprns:create:submitButton')
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
