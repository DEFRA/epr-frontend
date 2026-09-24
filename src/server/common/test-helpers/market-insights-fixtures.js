import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { buildMockAuth, sessionIdentity } from './auth-helper.js'
import { IDENTITIES } from './identity-helper.js'

/**
 * @import { OperatorCounts } from '#server/regulators/market-insights/helpers/few-operators.js'
 * @import { ExporterFigures, ExporterTotals, ReprocessorExporterTotals, ReprocessorFigures, ReprocessorTotals, WithOperatorCounts } from '#server/regulators/market-insights/helpers/to-reprocessor-exporter-tables.js'
 * @import { OutstandingByBand } from '#server/regulators/market-insights/helpers/to-outstanding-returns-tables.js'
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
 * The key a table carries, as its description, when a figure in it is marked
 * as coming from few operators.
 */
export const CONFIDENTIAL_KEY =
  'Some shorthand is used in this table, [c] = confidential. This figure could reveal an individual operator’s own figures, because only one or two operators could have contributed to it, or only one or two did.'

/** @returns {ReprocessorFigures} */
const noReprocessorFigures = () => ({
  tonnageReceived: 0,
  tonnageRecycled: 0,
  tonnageReceivedButNotRecycled: 0,
  tonnageSentOnTotal: 0,
  tonnageSentOnToReprocessor: 0,
  tonnageSentOnToExporter: 0,
  tonnageSentOnToOtherFacilities: 0,
  revisedTonnageIssued: 0,
  totalRevenue: 0,
  averagePricePerTonne: 0
})

/** @returns {ExporterFigures} */
const noExporterFigures = () => ({
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
  averagePricePerTonne: 0
})

/**
 * The operators behind a row, where a fixture names only the counts it cares
 * about and every other count is zero, which marks nothing.
 * @template {PropertyKey} Measure
 * @typedef {Partial<OperatorCounts> & {
 *   contributingOperatorCounts?: Partial<Record<Measure, number>>
 * }} CountsOf
 */

/**
 * @template {Record<string, number>} Figures
 * @param {Figures} figures
 * @param {Figures} noFigures - every figure at zero, which also serves as no operators behind each
 * @param {CountsOf<keyof Figures>} counts
 * @returns {WithOperatorCounts<Figures>}
 */
const withCounts = (
  figures,
  noFigures,
  { contributingOperatorCounts, ...counts }
) => ({
  ...figures,
  operatorCount: 0,
  submittingOperatorCount: 0,
  ...counts,
  contributingOperatorCounts: { ...noFigures, ...contributingOperatorCounts }
})

/**
 * @param {Partial<ReprocessorFigures>} [figures]
 * @param {CountsOf<keyof ReprocessorFigures>} [counts]
 * @returns {WithOperatorCounts<ReprocessorFigures>}
 */
export const reprocessorOf = (figures = {}, counts = {}) =>
  withCounts(
    { ...noReprocessorFigures(), ...figures },
    noReprocessorFigures(),
    counts
  )

/**
 * @param {Partial<ExporterFigures>} [figures]
 * @param {CountsOf<keyof ExporterFigures>} [counts]
 * @returns {WithOperatorCounts<ExporterFigures>}
 */
export const exporterOf = (figures = {}, counts = {}) =>
  withCounts(
    { ...noExporterFigures(), ...figures },
    noExporterFigures(),
    counts
  )

/** @returns {ReprocessorTotals} */
const noReprocessorTotals = () => {
  const { averagePricePerTonne: _average, ...totals } = noReprocessorFigures()
  return totals
}

/** @returns {ExporterTotals} */
const noExporterTotals = () => {
  const { averagePricePerTonne: _average, ...totals } = noExporterFigures()
  return totals
}

/**
 * A month's totals entry, which carries every figure but the average price.
 * @param {{
 *   reprocessor?: Partial<ReprocessorTotals>,
 *   exporter?: Partial<ExporterTotals>,
 *   reprocessorCounts?: CountsOf<keyof ReprocessorTotals>,
 *   exporterCounts?: CountsOf<keyof ExporterTotals>
 * }} [totals]
 * @returns {ReprocessorExporterTotals}
 */
export const totalsOf = ({
  reprocessor = {},
  exporter = {},
  reprocessorCounts = {},
  exporterCounts = {}
} = {}) => ({
  reprocessor: withCounts(
    { ...noReprocessorTotals(), ...reprocessor },
    noReprocessorTotals(),
    reprocessorCounts
  ),
  exporter: withCounts(
    { ...noExporterTotals(), ...exporter },
    noExporterTotals(),
    exporterCounts
  )
})

/**
 * The outstanding reports for one material in a month, with every band the
 * backend serves present, so a fixture names only the bands it cares about.
 * @param {Partial<OutstandingByBand>} counts
 * @returns {OutstandingByBand}
 */
export const bandsOf = (counts = {}) => ({
  up_to_500: 0,
  up_to_5000: 0,
  up_to_10000: 0,
  over_10000: 0,
  ...counts
})
