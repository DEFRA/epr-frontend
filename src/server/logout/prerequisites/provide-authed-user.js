import { getUserSession } from '~/src/server/common/helpers/auth/get-user-session.js'

/**
 * Prerequisite to provide authenticated user to request.pre
 * @type {import('@hapi/hapi').RouteOptionsPreObject}
 */
const provideAuthedUser = {
  method: async (request) => getUserSession(request),
  assign: 'authedUser'
}

export { provideAuthedUser }
