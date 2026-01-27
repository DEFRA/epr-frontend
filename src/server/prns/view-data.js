import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'

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
  const noteType =
    registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

  const pageTitle = localise(`prns:${noteType}:pageTitle`)
  const material = getDisplayMaterial(registration)

  return {
    pageTitle,
    heading: pageTitle,
    material: {
      label: localise('prns:materialLabel'),
      value: material
    },
    hiddenFields: {
      material: registration.material,
      nation: registration.nation || 'england',
      wasteProcessingType: registration.wasteProcessingType
    },
    tonnage: {
      label: localise(`prns:${noteType}:tonnageLabel`),
      hint: localise('prns:tonnageHint'),
      suffix: localise('prns:tonnageSuffix')
    },
    recipient: {
      label: localise(`prns:${noteType}:recipientLabel`),
      hint: localise('prns:recipientHint'),
      items: [{ value: '', text: localise('prns:selectOption') }, ...recipients]
    },
    help: {
      summary: localise('prns:helpSummary'),
      text: localise(`prns:${noteType}:helpText`)
    },
    notes: {
      label: localise('prns:notesLabel'),
      hint: localise(`prns:${noteType}:notesHint`)
    },
    submitButton: {
      text: localise(`prns:${noteType}:submitButton`)
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
