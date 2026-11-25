import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
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
  backendToken: toBackendToken('regulator-backend-token'),
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

/** The notice the market insights pages carried while they were being built. */
export const NOTICE =
  'This page is still being built. Some figures may be missing or wrong.'

/**
 * The heading of the page that lists the market insights figures, which every
 * page of them leads back to.
 */
export const LANDING_HEADING =
  'Reported reprocessor and exporter packaging waste data'

/**
 * The paragraphs the agreed content words differently for a nation's
 * figures than for the UK's. Only England's figures are in the workbook, so
 * only England's description says so.
 */
export const NATION_WORDING = {
  description:
    'For each month, the tables show what accredited reprocessors and exporters reported by material (tonnage received, recycled or exported, and sent on). They also show the tonnage PRNs and PERNs were issued for, the revenue from those notes and the average price for each tonne.',
  englandDescription:
    'For each month, the tables show what accredited reprocessors and exporters reported by material (tonnage received, recycled or exported, and sent on). They also show the tonnage PRNs and PERNs were issued for, the revenue from those notes and the average price for each tonne. These figures are included in the monthly redacted data workbook (XLSX).',
  rounding:
    'Each figure is rounded to two decimal places as it is added up. A total can differ by a few pence from the same figures added first and rounded once.',
  completeness:
    'The figures shown are only as good as the reports submitted by the operators. Operators who have not submitted a monthly report do not contribute to the reported figures. The most recent months are less complete as reports are still being submitted. Each month shows how many of the monthly reports have been received.',
  accreditations:
    'A report is only counted if the accreditation it relates to is currently approved or suspended. Where an accreditation has been cancelled, it counts neither as a submission nor as a non-submission for the relevant period. Any tonnage associated with a cancelled accreditation will remain in the waste balance so as not to distort the overall picture of packaging waste reprocessing and export.',
  marked:
    'Figures are marked [c] to show that the data came from only 1 or 2 operators. Figures are also marked [c] when no operators were accredited for it, but another figure in the same row holds data (for example, a late report from an operator cancelled for the whole month). Rows with no accredited operators and nothing in them are not marked [c].'
}

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
 * about. Every other count defaults to three operators accredited, which
 * marks nothing whatever the figures hold.
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
  operatorCount: 3,
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
