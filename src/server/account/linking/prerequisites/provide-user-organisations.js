import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'

/**
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 */

/**
 * Prerequisite to fetch and provide user organisations to request.pre
 * @type {import('@hapi/hapi').RouteOptionsPreObject<UserOrganisations>}
 */
const provideUserOrganisations = {
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
