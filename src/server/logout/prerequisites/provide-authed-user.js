import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * Prerequisite to provide authenticated user to request.pre
 * @type {import('@hapi/hapi').RouteOptionsPreObject}
 */
const provideAuthedUser = {
  method: async (request) => {
    const { value } = await getUserSession(request)
    return value
  },
  assign: 'authedUser',
  failAction: async () => {
    // Allow page to be rendered
  }
}

export { provideAuthedUser }
