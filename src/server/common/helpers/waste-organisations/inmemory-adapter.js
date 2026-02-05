/** @import {WasteOrganisationsService} from './port.js' */
/** @import {WasteOrganisation} from './types.js' */

/**
 * Creates an in-memory waste organisations service for testing and local development.
 * @param {WasteOrganisation[]} [initialOrganisations] - Initial organisations to populate the service with
 * @returns {WasteOrganisationsService}
 */
export function createInMemoryWasteOrganisationsService(
  initialOrganisations = []
) {
  const organisations = structuredClone(initialOrganisations)

  return {
    async getOrganisations() {
      return { organisations: structuredClone(organisations) }
    }
  }
}
