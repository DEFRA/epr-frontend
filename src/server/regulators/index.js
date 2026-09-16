import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { controller as loggedOutController } from './logged-out/controller.js'
import { controller as marketInsightsController } from './market-insights/controller.js'
import { controller } from './organisations/controller.js'
import { controller as startController } from './start/controller.js'

/**
 * Regulators plugin
 * Registers the regulator area: the page an Entra ID authenticated regulator
 * lands on, and the market insights page behind its own scope. A regulator
 * holds no organisation of their own, so the organisation search is what the
 * landing page shows them.
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
        {
          ...marketInsightsController,
          method: 'GET',
          path: paths.regulators.marketInsights,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        }
      ])
    }
  }
}
