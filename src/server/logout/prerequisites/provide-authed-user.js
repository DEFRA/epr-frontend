import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * Prerequisite to provide authenticated user to request.pre
 * @type {import('@hapi/hapi').RouteOptionsPreObject}
 */
const provideAuthedUser = {
  // @fixme: code coverage
  /* v8 ignore next */
  method: async (request) => {
    const { value } = await getUserSession(request)
    return value
  },
  assign: 'authedUser'
}

export { provideAuthedUser }
