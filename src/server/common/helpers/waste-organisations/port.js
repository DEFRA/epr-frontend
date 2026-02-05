/** @import {WasteOrganisation} from './types.js' */

/**
 * @typedef {{ organisations: WasteOrganisation[] }} WasteOrganisationsResponse
 */

/**
 * @typedef {{
 *   getOrganisations: () => Promise<WasteOrganisationsResponse>
 * }} WasteOrganisationsService
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
