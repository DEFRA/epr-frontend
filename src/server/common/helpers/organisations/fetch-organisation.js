import { backend, path } from '#server/common/helpers/backend-client.js'

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
const fetchOrganisation = (organisationNumber, backendToken, { year } = {}) => {
  const query = year ? `?${new URLSearchParams({ year: String(year) })}` : ''

  return backend(backendToken).get(
    `${path`/organisations/${organisationNumber}`}${query}`
  )
}

export { fetchOrganisation }
