/** @import {WasteOrganisation} from './types.js' */

/**
 * @typedef {{ organisations: WasteOrganisation[] }} WasteOrganisationsResponse
 */

/**
 * @typedef {{
 *   getOrganisations: () => Promise<WasteOrganisationsResponse>
 * }} WasteOrganisationsService
 */

/**
 * Extended interface for in-memory adapter (includes test helpers)
 * @typedef {WasteOrganisationsService & {
 *   setOrganisations: (orgs: WasteOrganisation[]) => void
 *   reset: () => void
 * }} InMemoryWasteOrganisationsService
 */

export {}
