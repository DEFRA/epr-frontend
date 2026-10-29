import { backend } from '#server/common/helpers/backend-client.js'

import { PAGE_SIZE } from './pagination.js'

/** @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js' */
/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */

/**
 * A page of organisations as the backend returns it.
 * @typedef {{
 *   items: OrganisationView[],
 *   page: number,
 *   pageSize: number,
 *   totalItems: number,
 *   totalPages: number
 * }} OrganisationsPage
 */

/**
 * Fetches one page of operator organisations, narrowed by name when the
 * regulator has searched. The page and page size always go with the request:
 * the backend answers a request carrying no criteria with every organisation
 * it holds, unpaginated.
 * @param {{ page: number, search?: string, backendToken: BackendToken }} query
 * @returns {Promise<OrganisationsPage>}
 */
export const fetchOrganisations = ({ page, search, backendToken }) =>
  backend(backendToken).get('/organisations', {
    query: { page, pageSize: PAGE_SIZE, search }
  })
