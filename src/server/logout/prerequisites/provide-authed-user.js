/**
 * Prerequisite to provide authenticated user to request.pre
 * @type {import('@hapi/hapi').RouteOptionsPreObject}
 */
const provideAuthedUser = {
  method: async (request) => await request.getUserSession(),
  assign: 'authedUser'
}

export { provideAuthedUser }
