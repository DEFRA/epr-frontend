import { paths } from '#server/paths.js'

import { fetchOrganisations } from './helpers/fetch-organisations.js'
import { buildPaginationLinks } from './helpers/pagination.js'
import { searchQuerySchema } from './helpers/search-query-schema.js'
import { toOrganisationRow } from './helpers/to-organisation-row.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { SearchQuery } from './helpers/search-query-schema.js'
 */

/**
 * The organisation search a regulator lands on. A regulator holds no
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
    const { backendToken, profile } = request.auth.credentials

    const results = await fetchOrganisations({ page, search, backendToken })

    return h.view('regulators/home', {
      pageTitle: request.t('regulators:organisations:pageTitle'),
      search,
      username: profile.email?.split('@')[0],
      organisations: results.items.map((organisation) =>
        toOrganisationRow(organisation, request.localiseUrl)
      ),
      pagination: buildPaginationLinks({
        basePath: request.localiseUrl(paths.regulators.home),
        page: results.page,
        totalPages: results.totalPages,
        search
      })
    })
  }
}
