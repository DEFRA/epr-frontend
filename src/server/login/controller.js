/**
 * Login controller
 * Triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, redirects to home page
 * @satisfies {Partial<ServerRoute>}
 */
const loginController = {
  options: {
    auth: 'defra-id',
    ext: {
      onPreAuth: {
        method: (request, h) => {
          // FIXME prefix with /cy for welsh language
          request.yar.flash('referrer', '/account')

          return h.continue
        }
      }
    }
  },
  /* @fixme: code coverage */
  /* v8 ignore next */
  handler: async (_request, h) => h.redirect('/account')
}

export { loginController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
