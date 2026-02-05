/** @import {WasteOrganisationsService} from './port.js' */
/** @import {WasteOrganisation} from './types.js' */

import fixtureData from '../../../../../fixtures/waste-organisations/organisations.json' with { type: 'json' }

/** @type {WasteOrganisation[]} */
const defaultOrganisations = fixtureData.organisations

/**
 * Creates an in-memory waste organisations service for testing and local development.
 * @param {WasteOrganisation[]} [initialOrganisations] - Initial organisations to populate the service with
 * @returns {WasteOrganisationsService}
 */
export function createInMemoryWasteOrganisationsService(
  initialOrganisations = defaultOrganisations
) {
  const organisations = structuredClone(initialOrganisations)

  return {
    async getOrganisations() {
      return { organisations: structuredClone(organisations) }
    }
  }
}
