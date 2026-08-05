import { logoutController } from '#server/logout/controller.js'
import { paths } from '#server/paths.js'

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
          path: paths.logout,
          options: {
            auth: { mode: 'try' }
          }
        }
      ])
    }
  }
}

export { logout }
