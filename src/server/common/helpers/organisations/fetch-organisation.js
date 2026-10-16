import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */
/** @import { OrganisationView } from './organisation-view.js' */

/**
 * Fetches the organisation by number, as it stood in `year` when one is given
 * @param {OrganisationNumber} organisationNumber
 * @param {string} backendToken - Bearer token for the backend
 * @param {{ year?: Year }} [options]
 * @returns {Promise<OrganisationView>}
 */
async function fetchOrganisation(
  organisationNumber,
  backendToken,
  { year } = {}
) {
  const query = year ? `?year=${year}` : ''
  const path = `/organisations/${organisationNumber}${query}`

  const organisation = await fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })

  return /** @type {OrganisationView} */ (organisation)
}

export { fetchOrganisation }
