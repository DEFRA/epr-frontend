import { backend, path } from '#server/common/helpers/backend-client.js'
import { toYear } from '#server/common/helpers/year.js'

/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */
/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */

/**
 * Fetches the years an organisation was active in
 * @param {OrganisationNumber} organisationNumber - The organisation number
 * @param {BackendToken} backendToken
 * @returns {Promise<Year[]>} Years, newest first
 */
const fetchOrganisationYears = async (organisationNumber, backendToken) => {
  /** @type {{ years: number[] }} */
  const { years } = await backend(backendToken).get(
    path`/organisations/${organisationNumber}/years`
  )

  return years.map(toYear)
}

export { fetchOrganisationYears }
