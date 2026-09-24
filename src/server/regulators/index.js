import { SCOPES } from '#server/auth/scopes.js'
import { paths } from '#server/paths.js'

import { controller as loggedOutController } from './logged-out/controller.js'
import { controller as marketInsightsController } from './market-insights/controller.js'
import { marketInsightsExportController } from './market-insights/export-controller.js'
import { controller as marketInsightsOutstandingReturnsController } from './market-insights/outstanding-returns/controller.js'
import { reprocessorExporterFiguresController } from './market-insights/reprocessor-exporter-figures/controller.js'
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
          ...reprocessorExporterFiguresController(),
          method: 'GET',
          path: paths.regulators.marketInsightsUk,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...reprocessorExporterFiguresController({ nation: 'england' }),
          method: 'GET',
          path: paths.regulators.marketInsightsEngland,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...reprocessorExporterFiguresController({ nation: 'wales' }),
          method: 'GET',
          path: paths.regulators.marketInsightsWales,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...reprocessorExporterFiguresController({ nation: 'scotland' }),
          method: 'GET',
          path: paths.regulators.marketInsightsScotland,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...reprocessorExporterFiguresController({
            nation: 'northern-ireland'
          }),
          method: 'GET',
          path: paths.regulators.marketInsightsNorthernIreland,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...marketInsightsOutstandingReturnsController,
          method: 'GET',
          path: paths.regulators.marketInsightsOutstandingReturns,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        },
        {
          ...marketInsightsExportController,
          method: 'GET',
          path: paths.regulators.marketInsightsExport,
          options: {
            auth: { scope: [SCOPES.marketDataRead] }
          }
        }
      ])
    }
  }
}
