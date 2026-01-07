/**
 * Login controller
 * Triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, auth callback redirects to organisation home (linked) or linking page (unlinked)
 * @satisfies {Partial<ServerRoute>}
 */
const loginController = {
  options: {
    auth: 'defra-id'
  },
  /* v8 ignore next - handler is fallback; defra-id auth strategy handles redirect */
  handler: async (request, h) => h.redirect(request.localiseUrl('/start'))
}

export { loginController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
