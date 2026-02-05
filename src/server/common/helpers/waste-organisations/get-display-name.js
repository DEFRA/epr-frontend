/** @import {WasteOrganisation} from './types.js' */

/**
 * Gets the display name for an organisation, preferring tradingName over name
 * @param {Pick<WasteOrganisation, 'name' | 'tradingName'>} organisation
 * @returns {string}
 */
export const getDisplayName = (organisation) =>
  organisation.tradingName || organisation.name
