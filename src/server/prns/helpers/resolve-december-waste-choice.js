import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { availableForPool } from '#server/common/helpers/waste-balance/available-for-pool.js'
import { DECEMBER_WASTE_CONTROL } from './december-waste-control.js'

/**
 * @typedef {(
 *   { mode: 'pool', legend: string, items: Array<{value: string, text: string}>, insetText: string }
 *   | { mode: 'manual', legend: string, items: Array<{value: string, text: string}> }
 *   | { mode: 'none' }
 * )} DecemberWasteControl
 */

/**
 * The December Waste control the create page shows, composed from the three
 * facts the backend states (see fetch-december-prn-eligibility.js) and the
 * balance it reports. Exactly one control by construction: an accreditation
 * either accrues a December pool to choose from, or self-declares the marker
 * for disclosure, or neither - never both, never ambiguous.
 * @param {DecemberPrnEligibility} eligibility
 * @param {(key: string, params?: object) => string} localise
 * @param {string} noteTypePlural - 'PRNs' or 'PERNs', for the pool-mode inset text
 * @param {WasteBalance | null} [wasteBalance]
 * @returns {DecemberWasteControl}
 */
export function resolveDecemberWasteControl(
  eligibility,
  localise,
  noteTypePlural,
  wasteBalance
) {
  const {
    accruesDecemberWasteBalance,
    declaresDecemberWasteManually,
    windowOpen
  } = eligibility

  if (accruesDecemberWasteBalance && windowOpen) {
    const balance = wasteBalance ?? { amount: 0, availableAmount: 0 }
    const decemberAvailable = availableForPool(balance, true)
    const generalAvailable = availableForPool(balance, false)

    return {
      mode: DECEMBER_WASTE_CONTROL.selectPool,
      legend: localise('prns:create:selectBalanceLegend'),
      items: [
        {
          value: 'true',
          text: localise('prns:create:decemberBalanceOption', {
            balance: formatTonnage(decemberAvailable)
          })
        },
        {
          value: 'false',
          text: localise('prns:create:nonDecemberBalanceOption', {
            balance: formatTonnage(generalAvailable)
          })
        }
      ],
      insetText: localise('prns:create:wasteBalanceEitherText', {
        noteTypePlural
      })
    }
  }

  if (declaresDecemberWasteManually && windowOpen) {
    return {
      mode: DECEMBER_WASTE_CONTROL.declareManually,
      legend: localise('prns:create:decemberWasteLegend'),
      items: [
        { value: 'false', text: localise('prns:decemberWasteNo') },
        { value: 'true', text: localise('prns:decemberWasteYes') }
      ]
    }
  }

  return { mode: DECEMBER_WASTE_CONTROL.none }
}

/**
 * @import { DecemberPrnEligibility } from './fetch-december-prn-eligibility.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */
