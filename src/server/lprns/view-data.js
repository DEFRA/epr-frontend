import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/get-note-type.js'
import { NOTES_MAX_LENGTH } from './constants.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'

/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string, material: string, nation?: string, glassRecyclingProcess?: string[]}} options.registration
 * @param {Array<{value: string, text: string}>} options.recipients
 * @returns {object}
 */
export function buildCreatePrnViewData(request, { registration, recipients }) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

  const pageTitle = localise('lprns:create:pageTitle', { noteType })
  const material = getLumpyDisplayMaterial(registration)

  return {
    pageTitle,
    heading: pageTitle,
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
      summary: localise('lprns:helpSummary'),
      text: localise('lprns:create:helpText', { noteTypePlural })
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
