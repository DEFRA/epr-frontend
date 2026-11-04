import { backend, path } from '#server/common/helpers/backend-client.js'

/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */
/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */
/** @import { OrganisationView } from './organisation-view.js' */

/**
 * Fetches the organisation by number, as it stood in `year` when one is given
 * @param {OrganisationNumber} organisationNumber
 * @param {BackendToken} backendToken
 * @param {{ year?: Year }} [options]
 * @returns {Promise<OrganisationView>}
 */
const fetchOrganisation = (organisationNumber, backendToken, { year } = {}) =>
  backend(backendToken).get(path`/organisations/${organisationNumber}`, {
    query: { year }
  })

export { fetchOrganisation }
