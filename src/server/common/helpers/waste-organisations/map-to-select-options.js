/** @import {WasteOrganisation} from './types.js' */

import { getDisplayName } from './get-display-name.js'

/**
 * @typedef {{value: string, text: string}} SelectOption
 */

/**
 * Maps waste organisations to sorted select options
 * @param {WasteOrganisation[]} organisations
 * @param {number} year
 * @returns {SelectOption[]}
 */
export const mapToSelectOptions = (organisations, year) =>
  organisations
    .map((org) => {
      const name = getDisplayName(org, year)
      const address = Object.values(org.address).filter(Boolean).join(', ')

      return {
        value: org.id,
        text: `${name}, ${address}`
      }
    })
    .toSorted((a, b) => a.text.localeCompare(b.text))
