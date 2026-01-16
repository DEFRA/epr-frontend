import { metrics } from '#server/common/helpers/metrics/index.js'

/**
 * Login plugin
 * Registers the /login route that triggers OIDC authentication
 * Adds a route that triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, auth callback redirects to organisation home (linked) or linking page (unlinked)
 */
const login = {
  plugin: {
    name: 'login',
    register: (server) => {
      server.route([
        {
          options: {
            ext: {
              onPreAuth: {
                method: async (_request, h) => {
                  await metrics.signInAttempted()
                  return h.continue
                }
              }
            },
            auth: 'defra-id'
          },
          method: 'GET',
          path: '/login',
          /* v8 ignore next - handler is fallback; defra-id auth strategy handles redirect */
          handler: async (request, h) =>
            h.redirect(request.localiseUrl('/start'))
        }
      ])
    }
  }
}

export { login }
