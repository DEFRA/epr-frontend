/** @import {WasteOrganisation} from './types.js' */

/**
 * @typedef {{ organisations: WasteOrganisation[] }} WasteOrganisationsResponse
 */

/**
 * @typedef {{
 *   getOrganisations: () => Promise<WasteOrganisationsResponse>
 * }} WasteOrganisationsService
 */

export {}
