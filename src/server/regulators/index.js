import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { controller as loggedOutController } from './logged-out/controller.js'
import { controller as marketInsightsController } from './market-insights/controller.js'
import { controller as marketInsightsUkController } from './market-insights/uk/controller.js'
import { controller as marketInsightsWasteBalanceController } from './market-insights/waste-balance/controller.js'
import { controller } from './organisations/controller.js'
import { controller as startController } from './start/controller.js'

/**
 * Regulators plugin
 * Registers the regulator area: the page an Entra ID authenticated regulator
 * lands on, and market insights behind its own scope. A regulator holds no
 * organisation of their own, so the organisation search is what the landing
 * page shows them. Market insights is a page per set of figures, mirroring the
 * tabs of the monthly workbook, behind a listing page that links to them.
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
        },
        {
          ...marketInsightsWasteBalanceController,
          method: 'GET',
          path: paths.regulators.marketInsightsWasteBalance,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...marketInsightsUkController,
          method: 'GET',
          path: paths.regulators.marketInsightsUk,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        }
      ])
    }
  }
}
