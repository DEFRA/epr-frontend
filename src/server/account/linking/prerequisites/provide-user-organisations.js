import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'

/**
 * @import { RouteOptionsPreObject } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 */

/**
 * `pre` payload contributed by {@link provideUserOrganisations}. Controllers
 * that register this prerequisite should type their `request` as
 * `HapiRequest & { pre: UserOrganisationsPres }` to read
 * `request.pre.userOrganisations`.
 * @typedef {{ userOrganisations: UserOrganisations | null }} UserOrganisationsPres
 */

/**
 * Prerequisite to fetch and provide user organisations to request.pre.
 *
 * Typed as the generic {@link RouteOptionsPreObject} (with Hapi's default
 * `ReqRef`) so that the enclosing route's `pre` array stays assignable to
 * `RouteOptionsPreAllOptions<ReqRefDefaults>`. The `method`'s `request`
 * parameter is annotated explicitly with our decorated {@link HapiRequest}
 * typedef; downstream controllers cast `request.pre.userOrganisations` via
 * {@link UserOrganisationsPres} to recover the return value's shape.
 * @satisfies {RouteOptionsPreObject}
 */
const provideUserOrganisations = {
  /**
   * @param {HapiRequest} request
   * @returns {Promise<UserOrganisations | null>}
   */
  method: async (request) => {
    const session = request.auth.credentials

    if (!session) {
      return null
    }

    return fetchUserOrganisations(session.idToken)
  },
  assign: 'userOrganisations'
}

export { provideUserOrganisations }
