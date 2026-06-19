import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { isRegisteredOnlyProcessingType } from '#domain/summary-logs/meta-fields.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import {
 *   ChangeViewModel,
 *   LoadRow,
 *   LoadRowViewModel,
 *   Localise,
 *   LoadsByReportingPeriod,
 *   PeriodStatus,
 *   PeriodStatusByChange,
 *   PeriodViewModel
 * } from './types.js'
 */

const ENHANCED_CHECK_VIEW_NAME = 'summary-log/enhanced-check'

const ZERO_TONNAGE = formatTonnage(0)

/** Exclusion codes that resolve to a fixed reason string (PRN_ISSUED varies). */
const FIXED_REASON_CODES = new Set([
  'MISSING_REQUIRED_FIELD',
  'PRODUCT_WEIGHT_NOT_ADDED',
  'ORS_NOT_APPROVED'
])

/**
 * Exporters issue PERNs, reprocessors PRNs, so the same PRN_ISSUED code renders
 * differently by processing type.
 * @param {ProcessingType} processingType
 * @returns {boolean}
 */
const isExporterType = (processingType) =>
  processingType === 'EXPORTER' || processingType === 'EXPORTER_REGISTERED_ONLY'

/**
 * Locale key under enhanced.reason for one exclusion code, or null when the
 * code carries no display string (so an unmapped code degrades to no reason
 * rather than a raw key).
 * @param {string} code
 * @param {ProcessingType} processingType
 * @returns {string | null}
 */
const reasonKey = (code, processingType) => {
  if (code === 'PRN_ISSUED') {
    return isExporterType(processingType) ? 'PERN_ISSUED' : 'PRN_ISSUED'
  }
  return FIXED_REASON_CODES.has(code) ? code : null
}

/**
 * Joins the load's distinct exclusion reasons into one display string, or null
 * when it carries none (an included load).
 * @param {string[]} exclusionReasons
 * @param {ProcessingType} processingType
 * @param {Localise} localise
 * @returns {string | null}
 */
const resolveReasonText = (exclusionReasons, processingType, localise) => {
  const texts = exclusionReasons
    .map((code) => reasonKey(code, processingType))
    .filter((key) => key !== null)
    .map((key) => localise(`summary-log:enhanced.reason.${key}`))
  return texts.length > 0 ? texts.join(', ') : null
}

/**
 * Projects one backend row into a view row: the operator's worksheet (tab)
 * name, the row id, and (only where the design surfaces it) the exclusion
 * reason text. Adjusted loads list worksheet and row id alone, so includeReason
 * is false for them even when the row carries exclusion codes.
 * @param {LoadRow} row
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @param {boolean} includeReason
 * @returns {LoadRowViewModel}
 */
const mapLoadRow = (
  { rowId, wasteRecordType, exclusionReasons },
  { processingType, localise },
  includeReason
) => ({
  worksheetName: localise(
    `summary-log:enhanced.worksheet.${processingType}.${wasteRecordType}`
  ),
  rowId,
  reasonText: includeReason
    ? resolveReasonText(exclusionReasons, processingType, localise)
    : null
})

/**
 * Projects a bucket's rows into view rows. Buckets always carry a rows array
 * from the backend, but tolerate its absence (older fixtures) by treating it
 * as empty.
 * @param {LoadRow[] | undefined} rows
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @param {boolean} includeReason
 * @returns {LoadRowViewModel[]}
 */
const mapLoadRows = (rows, ctx, includeReason) =>
  (rows ?? []).map((row) => mapLoadRow(row, ctx, includeReason))

/**
 * Splits a balance-affecting bucket's rows into the two sub-groups the adjusted
 * accordion renders: loads with all required data (whose heading reflects
 * whether the group added to or reduced the balance) and loads still missing
 * data. Neither sub-group shows a per-row reason.
 * @param {import('./types.js').BalanceAffectingBucket} bucket
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @returns {import('./types.js').BalanceAffectingViewModel}
 */
const splitBalanceAffecting = (bucket, ctx) => {
  const rows = bucket.rows ?? []
  const withData = rows.filter((row) => row.exclusionReasons.length === 0)
  const withoutData = rows.filter((row) => row.exclusionReasons.length > 0)
  const withDataDelta = withData.reduce((sum, row) => sum + row.tonnageDelta, 0)

  return {
    count: bucket.count,
    withData: {
      addsToBalance: withDataDelta >= 0,
      rows: mapLoadRows(withData, ctx, false)
    },
    withoutData: { rows: mapLoadRows(withoutData, ctx, false) }
  }
}

/**
 * Builds the view model for a single change type (added or adjusted). Tonnage
 * comes solely from the balance-affecting bucket; non-balance-affecting loads
 * do not move the waste balance, so they contribute count only. Returns null
 * when the total count is zero so the template can hide the section.
 * Reasons are surfaced only for new (added) non-balance-affecting loads; every
 * other bucket lists worksheet and row id alone.
 * @param {PeriodStatusByChange} change
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @param {'added' | 'adjusted'} changeKind
 * @returns {ChangeViewModel | null}
 */
const buildChangeViewModel = (change, ctx, changeKind) => {
  const { balanceAffecting, nonBalanceAffecting } = change
  const count = balanceAffecting.count + nonBalanceAffecting.count

  if (count === 0) {
    return null
  }

  const rawDelta = balanceAffecting.tonnageDelta
  const absoluteTonnage = formatTonnage(Math.abs(rawDelta))

  return {
    count,
    absoluteTonnage,
    addsToBalance: rawDelta >= 0,
    hasTonnageDelta: absoluteTonnage !== ZERO_TONNAGE,
    balanceAffecting: splitBalanceAffecting(balanceAffecting, ctx),
    nonBalanceAffecting: {
      count: nonBalanceAffecting.count,
      rows: mapLoadRows(nonBalanceAffecting.rows, ctx, changeKind === 'added')
    }
  }
}

/**
 * Net tonnage a period contributes to the waste balance. Only balance-affecting
 * loads move the balance; non-balance-affecting loads carry no tonnage.
 * @param {PeriodStatus} period
 * @returns {number}
 */
const periodBalanceDelta = (period) =>
  period.added.balanceAffecting.tonnageDelta +
  period.adjusted.balanceAffecting.tonnageDelta

/**
 * Builds the projected waste balance panel view model (accredited only). Hidden
 * when the balance is unavailable or the net delta is zero (nothing to project).
 * @param {boolean} isAccredited
 * @param {number | undefined} wasteBalance - Current available waste balance
 * @param {LoadsByReportingPeriod} loadsByReportingPeriod
 * @returns {{ current: string, projected: string } | null}
 */
const buildWasteBalanceProjection = (
  isAccredited,
  wasteBalance,
  loadsByReportingPeriod
) => {
  const netDelta =
    periodBalanceDelta(loadsByReportingPeriod.openPeriodLoads) +
    periodBalanceDelta(loadsByReportingPeriod.closedPeriodLoads)

  // Compare on the rounded (2dp) value rather than === 0: the delta is a sum of
  // up to four floats, so exact cancellation can leave a sub-penny residue, and
  // a real delta below half a penny rounds away to nothing visible anyway.
  const netDeltaIsZero = formatTonnage(netDelta) === ZERO_TONNAGE

  if (!isAccredited || wasteBalance === undefined || netDeltaIsZero) {
    return null
  }

  return {
    current: formatTonnage(wasteBalance),
    projected: formatTonnage(wasteBalance + netDelta)
  }
}

/**
 * Builds the view model for a single period (open or closed). Returns null when
 * both change types are empty so the template hides the whole period.
 * @param {PeriodStatus} period
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @returns {PeriodViewModel | null}
 */
const buildPeriodViewModel = (period, ctx) => {
  const added = buildChangeViewModel(period.added, ctx, 'added')
  const adjusted = buildChangeViewModel(period.adjusted, ctx, 'adjusted')

  if (added === null && adjusted === null) {
    return null
  }

  return { added, adjusted }
}

/**
 * Renders the enhanced (CMA-aware) summary log check page, gated behind the
 * enhancedSummaryLogCheckPages feature flag. Accredited processing types show
 * waste balance language; registered-only types show totals only. When every
 * bucket is empty the template renders the four-section empty state.
 *
 * A validated summary log is always paired with loadsByReportingPeriod by the
 * backend; if that invariant breaks we throw rather than rendering a misleading
 * empty page (mirrors the loadsByWasteRecordType guard in renderCheckView).
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string, params?: object) => string} localise - i18n localisation function
 * @param {{
 *   loadsByReportingPeriod?: LoadsByReportingPeriod,
 *   processingType: ProcessingType,
 *   organisationId: string,
 *   registrationId: string,
 *   summaryLogId: string,
 *   wasteBalance?: number
 * }} context - View context
 * @returns {ResponseObject} Hapi view response
 */
export const renderEnhancedCheckView = (
  h,
  localise,
  {
    loadsByReportingPeriod,
    processingType,
    organisationId,
    registrationId,
    summaryLogId,
    wasteBalance
  }
) => {
  if (loadsByReportingPeriod === undefined) {
    throw new Error('Expected loadsByReportingPeriod for validated summary log')
  }

  const isAccredited = !isRegisteredOnlyProcessingType(processingType)

  const ctx = { processingType, localise }
  const open = buildPeriodViewModel(loadsByReportingPeriod.openPeriodLoads, ctx)
  const closed = buildPeriodViewModel(
    loadsByReportingPeriod.closedPeriodLoads,
    ctx
  )

  return h.view(ENHANCED_CHECK_VIEW_NAME, {
    pageTitle: localise('summary-log:checkPageTitle'),
    organisationId,
    registrationId,
    summaryLogId,
    isAccredited,
    periodSections: { open, closed },
    isEmpty: open === null && closed === null,
    wasteBalanceProjection: buildWasteBalanceProjection(
      isAccredited,
      wasteBalance,
      loadsByReportingPeriod
    )
  })
}
