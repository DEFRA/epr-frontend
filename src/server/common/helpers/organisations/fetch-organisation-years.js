import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { year } from '#server/common/helpers/year.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */

/**
 * Fetches the years an organisation held approved registrations in
 * @param {OrganisationNumber} organisationNumber - The organisation number
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<Year[]>} Years, newest first
 */
async function fetchOrganisationYears(organisationNumber, backendToken) {
  const path = `/organisations/${organisationNumber}/years`

  const { years } = /** @type {{ years: number[] }} */ (
    await fetchJsonFromBackend(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )

  return years.map(year)
}

export { fetchOrganisationYears }
