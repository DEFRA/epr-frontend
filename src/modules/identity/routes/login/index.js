import { loginController } from '#modules/identity/routes/login/controller.js'

/**
 * Login plugin
 * Registers the /login route that triggers OIDC authentication
 */
const login = {
  plugin: {
    name: 'login',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/login',
          ...loginController
        }
      ])
    }
  }
}

export { login }
