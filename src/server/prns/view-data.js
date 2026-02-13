import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { NOTES_MAX_LENGTH } from './constants.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'

/**
 * Build view data for the create PRN/PERN page
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {{wasteProcessingType: string, material: string, nation?: string, glassRecyclingProcess?: string[]}} options.registration
 * @param {Array<{value: string, text: string}>} options.recipients
 * @param {{availableAmount: number} | null} [options.wasteBalance]
 * @returns {object}
 */
export function buildCreatePrnViewData(
  request,
  { organisationId, recipients, registration, registrationId, wasteBalance }
) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

  const pageTitle = localise('prns:create:pageTitle', { noteType })
  const material = getDisplayMaterial(registration)

  const wasteBalanceText = wasteBalance
    ? localise('prns:create:wasteBalanceText', {
        noteTypePlural,
        balance: formatTonnage(wasteBalance.availableAmount)
      })
    : null

  return {
    pageTitle,
    heading: pageTitle,
    wasteBalanceText,
    backUrl: `/organisations/${organisationId}/registrations/${registrationId}`,
    material: {
      label: localise('prns:materialLabel'),
      value: material
    },
    hiddenFields: {
      nation: registration.nation || 'england',
      wasteProcessingType: registration.wasteProcessingType
    },
    tonnage: {
      label: localise('prns:create:tonnageLabel', { noteType }),
      hint: localise('prns:tonnageHint'),
      suffix: localise('prns:tonnageSuffix')
    },
    recipient: {
      label: localise('prns:create:recipientLabel', { noteType }),
      hint: localise('prns:recipientHint'),
      items: [{ value: '', text: localise('prns:selectOption') }, ...recipients]
    },
    help: {
      summary: localise('prns:help:summary'),
      intro: localise('prns:create:helpIntro', { noteTypePlural }),
      listIntro: localise('prns:help:listIntro'),
      listItemOne: localise('prns:help:listItemOne'),
      listItemTwo: localise('prns:help:listItemTwo')
    },
    notes: {
      label: localise('prns:notesLabel'),
      hint: localise('prns:create:notesHint', { noteType }),
      maxLength: NOTES_MAX_LENGTH
    },
    submitButton: {
      text: localise('prns:create:submitButton')
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
