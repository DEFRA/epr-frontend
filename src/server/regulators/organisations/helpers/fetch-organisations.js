import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

import { PAGE_SIZE } from './pagination.js'

/** @import { SearchedOrganisation } from './to-organisation-row.js' */

/**
 * A page of organisations as the backend returns it.
 * @typedef {{
 *   items: SearchedOrganisation[],
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
 * @param {{ page: number, search?: string, backendToken: string }} query
 * @returns {Promise<OrganisationsPage>}
 */
export const fetchOrganisations = async ({ page, search, backendToken }) => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE)
  })

  if (search) {
    params.set('search', search)
  }

  return /** @type {Promise<OrganisationsPage>} */ (
    fetchJsonFromBackend(`/v1/organisations?${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )
}
