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

const ORGANISATION_NUMBER = /^\d+$/

/**
 * Fetches one page of operator organisations, narrowed by organisation number
 * when the search is all digits, otherwise by name. The backend ANDs its
 * criteria, so only one is sent. The page and page size always go with the
 * request: the backend answers a request carrying no criteria with every
 * organisation it holds, unpaginated.
 * @param {{ page: number, search?: string, backendToken: string }} query
 * @returns {Promise<OrganisationsPage>}
 */
export const fetchOrganisations = async ({ page, search, backendToken }) => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE)
  })
  const term = search?.trim()

  if (term) {
    params.set(ORGANISATION_NUMBER.test(term) ? 'orgId' : 'search', term)
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
