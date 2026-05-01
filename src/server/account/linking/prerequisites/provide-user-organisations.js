import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'

/**
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
