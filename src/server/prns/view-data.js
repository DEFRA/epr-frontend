import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getRegistrationMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { NOTES_MAX_LENGTH } from './constants.js'
import { DECEMBER_WASTE_CONTROL } from './helpers/december-waste-control.js'

/**
 * Build view data for the create PRN/PERN page
 * @param {HapiRequest} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {Registration & { nation?: string }} options.registration
 * @param {Array<{value: string, text: string}>} options.recipients
 * @param {WasteBalance | null} [options.wasteBalance]
 * @param {DecemberWasteControl} options.decemberWasteControl
 * @returns {object}
 */
export function buildCreatePrnViewData(
  request,
  {
    organisationId,
    recipients,
    registration,
    registrationId,
    wasteBalance,
    decemberWasteControl
  }
) {
  const { t: localise } = request
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

  const pageTitle = localise('prns:create:pageTitle', { noteType })
  const material = getRegistrationMaterialDisplayName(registration)

  const isPoolMode =
    decemberWasteControl.mode === DECEMBER_WASTE_CONTROL.selectPool

  const wasteBalanceMessage = wasteBalance
    ? localise('prns:create:wasteBalanceText', {
        noteTypePlural,
        balance: formatTonnage(wasteBalance.availableAmount)
      })
    : null

  const wasteBalanceText = isPoolMode
    ? decemberWasteControl.insetText
    : wasteBalanceMessage

  const decemberWaste =
    decemberWasteControl.mode === DECEMBER_WASTE_CONTROL.none
      ? null
      : decemberWasteControl

  return {
    pageTitle,
    heading: pageTitle,
    wasteBalanceText,
    decemberWaste,
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
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { DecemberWasteControl } from './helpers/resolve-december-waste-choice.js'
 */
