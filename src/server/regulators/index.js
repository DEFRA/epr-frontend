import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { controller } from './organisations/controller.js'

/**
 * Regulators plugin
 * Registers the page an Entra ID authenticated regulator lands on. A regulator
 * holds no organisation of their own, so the organisation search is what that
 * page shows them.
 */
export const regulators = {
  plugin: {
    name: 'regulators',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: paths.regulators.home,
          options: {
            ...controller.options,
            auth: { scope: [SCOPES.organisationSearch] }
          }
        }
      ])
    }
  }
}
