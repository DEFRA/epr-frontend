import { config } from '#config/config.js'
import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { controller as loggedOutController } from './logged-out/controller.js'
import { controller as marketInsightsController } from './market-insights/controller.js'
import { controller } from './organisations/controller.js'
import { controller as startController } from './start/controller.js'

/**
 * Regulators plugin
 * Registers the page an Entra ID authenticated regulator lands on. A regulator
 * holds no organisation of their own, so the organisation search is what that
 * page shows them.
 *
 * The market insights preview carries a flag of its own. Regulator sign-in and
 * the publication ship on different schedules, so the page is absent from the
 * route table until it is switched on rather than reachable behind its scope.
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
        },
        {
          ...loggedOutController,
          method: 'GET',
          path: paths.regulators.loggedOut,
          options: {
            auth: { mode: 'try' }
          }
        },
        {
          ...startController,
          method: 'GET',
          path: paths.regulators.start,
          options: {
            auth: { mode: 'try' }
          }
        },
        ...(config.get('featureFlags.marketInsights')
          ? [
              {
                ...marketInsightsController,
                method: /** @type {const} */ ('GET'),
                path: paths.regulators.marketInsights,
                options: {
                  auth: { scope: [SCOPES.marketDataRead] }
                }
              }
            ]
          : [])
      ])
    }
  }
}
