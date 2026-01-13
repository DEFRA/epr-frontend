import { logoutController } from '#server/logout/controller.js'

/**
 * Logout plugin
 * Registers the /logout route that clears session and redirects to Defra ID logout
 */
const logout = {
  plugin: {
    name: 'logout',
    register: (server) => {
      server.route([
        {
          ...logoutController,
          method: 'GET',
          path: '/logout',
          options: {
            auth: { mode: 'try' },
            ...logoutController.options
          }
        }
      ])
    }
  }
}

export { logout }
