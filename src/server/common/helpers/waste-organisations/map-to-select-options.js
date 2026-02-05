/** @import {WasteOrganisation} from './types.js' */

/**
 * @typedef {{value: string, text: string}} SelectOption
 */

/**
 * Maps waste organisations to sorted select options
 * @param {WasteOrganisation[]} organisations
 * @returns {SelectOption[]}
 */
export const mapToSelectOptions = (organisations) =>
  organisations
    .map((org) => {
      const name = org.tradingName || org.name
      const address = Object.values(org.address).filter(Boolean).join(', ')

      return {
        value: org.id,
        text: `${name}, ${address}`
      }
    })
    .toSorted((a, b) => a.text.localeCompare(b.text))
