import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * Fetches the years an organisation held approved registrations in
 * @param {number} organisationNumber - The organisation number
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<number[]>} Years, newest first
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

  return years
}

export { fetchOrganisationYears }
