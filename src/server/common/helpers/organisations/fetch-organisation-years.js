import { backend, path } from '#server/common/helpers/backend-client.js'
import { year } from '#server/common/helpers/year.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */

/**
 * Fetches the years an organisation held approved registrations in
 * @param {OrganisationNumber} organisationNumber - The organisation number
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<Year[]>} Years, newest first
 */
const fetchOrganisationYears = async (organisationNumber, backendToken) => {
  /** @type {{ years: number[] }} */
  const { years } = await backend(backendToken).get(
    path`/organisations/${organisationNumber}/years`
  )

  return years.map(year)
}

export { fetchOrganisationYears }
