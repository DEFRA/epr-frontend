import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import Boom from '@hapi/boom'

/**
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/**
 * `pre` payload contributed by {@link provideUserOrganisations}. Controllers
 * that register this prerequisite should type their `request` as
 * `HapiRequest & { pre: UserOrganisationsPres }` to read
 * `request.pre.userOrganisations`.
 * @typedef {{ userOrganisations: UserOrganisations }} UserOrganisationsPres
 */

const provideUserOrganisations = {
  /**
   * Runs as a `pre` on routes where the session is required, so
   * `credentials` is guaranteed to be present. Throws a Boom.unauthorized
   * error if the session is absent (which suggests the pre handler has been
   * registered for use on a route that doesn't require authorisation).
   * @param {{ auth: { credentials: UserSession | null } }} request
   * @returns {Promise<UserOrganisations>}
   */
  method: async (request) => {
    const session = request.auth.credentials

    if (!session) {
      throw Boom.unauthorized('User session is required to fetch organisations')
    }

    return fetchUserOrganisations(session.backendToken)
  },
  assign: 'userOrganisations'
}

export { provideUserOrganisations }
