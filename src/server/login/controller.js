/**
 * Login controller
 * Triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, redirects to home page
 */
const loginController = {
  options: {
    auth: 'defra-id'
  },
  handler: async (request, h) => h.redirect('/')
}

export { loginController }
