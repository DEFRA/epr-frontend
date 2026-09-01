import { paths } from '#server/paths.js'

import { fetchOrganisations } from './helpers/fetch-organisations.js'
import {
  buildPaginationLinks,
  lastPageOf,
  organisationsPageHref
} from './helpers/pagination.js'
import { searchQuerySchema } from './helpers/search-query-schema.js'
import { toOrganisationRow } from './helpers/to-organisation-row.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { SearchQuery } from './helpers/search-query-schema.js'
 */

/**
 * The organisation list a regulator lands on. A regulator holds no
 * organisation of their own, so searching is how they reach an operator at
 * all, and the page shows every organisation until they narrow it.
 * @satisfies {Partial<HapiServerRoute<HapiRequest & { query: SearchQuery }>>}
 */
export const controller = {
  options: {
    validate: {
      query: searchQuerySchema
    }
  },
  async handler(request, h) {
    const { page, search } = request.query
    const { backendToken } = request.auth.credentials

    const results = await fetchOrganisations({ page, search, backendToken })
    const basePath = request.localiseUrl(paths.regulators.home)
    const lastPage = lastPageOf(results.totalPages)

    // A page number beyond the results renders as an empty table, which reads
    // as 'your search found nothing' rather than 'there is no page 5'. Sending
    // the regulator to the last page that exists corrects the address as well
    // as the page, so a reload or a shared link no longer overshoots.
    if (page > lastPage) {
      return h.redirect(
        organisationsPageHref({ basePath, page: lastPage, search })
      )
    }

    return h.view('regulators/home', {
      pageTitle: request.t('regulators:organisations:pageTitle'),
      search,
      clearSearchHref: basePath,
      organisations: results.items.map((organisation) =>
        toOrganisationRow(organisation, request.localiseUrl, request.t)
      ),
      pagination: buildPaginationLinks({
        basePath,
        page: results.page,
        totalPages: results.totalPages,
        search
      })
    })
  }
}
