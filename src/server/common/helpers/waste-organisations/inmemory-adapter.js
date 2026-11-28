/** @import {WasteOrganisationsService} from './port.js' */
/** @import {WasteOrganisation} from './types.js' */
/** @import {Year} from '#server/common/helpers/year.js' */

/**
 * An organisation without registrationYears counts as registered for every
 * requested year, so local fixtures need not state them.
 * @typedef {Omit<WasteOrganisation, 'registrationYears'> & {
 *   registrationYears?: Year[]
 * }} InMemoryWasteOrganisation
 */

/**
 * Creates an in-memory waste organisations service for testing and local development.
 * @param {InMemoryWasteOrganisation[]} [initialOrganisations] - Initial organisations to populate the service with
 * @returns {WasteOrganisationsService}
 */
export function createInMemoryWasteOrganisationsService(
  initialOrganisations = []
) {
  const organisations = structuredClone(initialOrganisations)

  return {
    async getOrganisations(registrationYears) {
      return {
        organisations: structuredClone(organisations).flatMap(
          (organisation) => {
            const heldYears = registrationYears.filter(
              (year) => organisation.registrationYears?.includes(year) ?? true
            )
            return heldYears.length > 0
              ? [{ ...organisation, registrationYears: heldYears }]
              : []
          }
        )
      }
    }
  }
}
