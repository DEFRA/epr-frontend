import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { backend } from '#server/common/helpers/backend-client.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * @import { Boom } from '@hapi/boom'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { OrganisationsPage } from '#server/regulators/organisations/helpers/fetch-organisations.js'
 */

const REFUSED = Object.freeze([statusCodes.forbidden, statusCodes.notFound])

/**
 * A 403 or 404 means the user cannot see the record, which is the same as no
 * record.
 * @template T
 * @param {Promise<T>} lookup
 * @returns {Promise<T | null>}
 */
const nullWhenRefused = async (lookup) => {
  try {
    return await lookup
  } catch (error) {
    if (REFUSED.includes(/** @type {Boom} */ (error).output.statusCode)) {
      return null
    }

    throw error
  }
}

/**
 * @param {string} organisationId
 * @param {string} backendToken
 * @returns {Promise<Organisation | null>}
 */
export const findOrganisationById = async (organisationId, backendToken) =>
  nullWhenRefused(fetchOrganisationById(organisationId, backendToken))

/**
 * @param {string} organisationNumber
 * @param {string} backendToken
 * @returns {Promise<Organisation | null>}
 */
const searchByNumber = async (organisationNumber, backendToken) => {
  const query = new URLSearchParams({
    orgId: organisationNumber,
    page: '1',
    pageSize: '1'
  })

  /** @type {OrganisationsPage | null} */
  const page = await nullWhenRefused(
    backend(backendToken).get(`/v1/organisations?${query}`)
  )

  const [match] = page?.items ?? []

  return match ? findOrganisationById(match.id, backendToken) : null
}

/**
 * A regulator searches for the number. An operator can only reach their own
 * organisation, and cannot search.
 * @param {string} organisationNumber
 * @param {UserSession} credentials
 * @returns {Promise<Organisation | null>}
 */
export const findOrganisationByNumber = async (
  organisationNumber,
  credentials
) => {
  if (readsAsARegulator(credentials)) {
    return searchByNumber(organisationNumber, credentials.backendToken)
  }

  if (!credentials.linkedOrganisationId) {
    return null
  }

  const organisation = await findOrganisationById(
    credentials.linkedOrganisationId,
    credentials.backendToken
  )

  return organisation?.orgId === Number(organisationNumber)
    ? organisation
    : null
}
