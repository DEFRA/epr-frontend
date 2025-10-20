/**
 * Login controller
 * Triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, redirects to home page
 * @satisfies {Partial<ServerRoute>}
 */
const loginController = {
  options: {
    auth: 'defra-id'
  },
  /* @fixme: code coverage */
  /* v8 ignore next */
  handler: async (_request, h) => h.redirect('/')
}

export { loginController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
