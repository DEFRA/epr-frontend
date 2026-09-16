import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { buildMockAuth, sessionIdentity } from './auth-helper.js'
import { IDENTITIES } from './identity-helper.js'

/**
 * @import { ExporterFigures, ReprocessorFigures } from '#server/regulators/market-insights/helpers/to-reprocessor-exporter-tables.js'
 */

/** A regulator, who reads every market insights page. */
export const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'regulator@example.com' },
  backendToken: 'regulator-backend-token',
  ...sessionIdentity(IDENTITIES.regulator)
})

/** An operator, who reads none of them. */
export const operator = buildMockAuth()

/**
 * A regulator the backend granted no market data scope, so the role alone is
 * not enough to reach the pages.
 */
export const regulatorWithoutMarketScope = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'no.market@example.com' },
  role: IDENTITIES.regulator.role,
  scope: [SCOPES.organisationSearch]
})

/** The words every market insights page carries while it is being built. */
export const NOTICE =
  'This page is still being built. Some figures may be missing or wrong.'

/**
 * @param {Partial<ReprocessorFigures>} figures
 * @returns {ReprocessorFigures}
 */
export const reprocessorOf = (figures = {}) => ({
  tonnageReceived: 0,
  tonnageRecycled: 0,
  tonnageReceivedButNotRecycled: 0,
  tonnageSentOnTotal: 0,
  tonnageSentOnToReprocessor: 0,
  tonnageSentOnToExporter: 0,
  tonnageSentOnToOtherFacilities: 0,
  revisedTonnageIssued: 0,
  totalRevenue: 0,
  averagePricePerTonne: 0,
  ...figures
})

/**
 * @param {Partial<ExporterFigures>} figures
 * @returns {ExporterFigures}
 */
export const exporterOf = (figures = {}) => ({
  tonnageReceived: 0,
  tonnageExported: 0,
  tonnageReceivedButNotExported: 0,
  tonnageSentOnTotal: 0,
  tonnageSentOnToReprocessor: 0,
  tonnageSentOnToExporter: 0,
  tonnageSentOnToOtherFacilities: 0,
  tonnageStopped: 0,
  tonnageRefused: 0,
  tonnageRepatriated: 0,
  revisedTonnageIssued: 0,
  totalRevenue: 0,
  averagePricePerTonne: 0,
  ...figures
})
