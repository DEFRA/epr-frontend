import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'

/**
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 * @import { UserSession } from '#server/auth/types/session.js'
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
   * Runs as a `pre` on routes where the session is optional (try-mode), so
   * `credentials` may be absent when the user is not logged in.
   * @param {{ auth: { credentials: UserSession | null } }} request
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
