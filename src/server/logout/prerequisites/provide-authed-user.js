import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * Prerequisite to provide authenticated user to request.pre
 * @type {import('@hapi/hapi').RouteOptionsPreObject}
 */
const provideAuthedUser = {
  // @fixme: code coverage
  /* v8 ignore next */
  method: async (request) => {
    const { ok, value } = await getUserSession(request)
    return ok ? value : null
  },
  assign: 'authedUser'
}

export { provideAuthedUser }
