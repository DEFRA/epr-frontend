import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { PROCESSING_TYPES } from '#domain/summary-logs/meta-fields.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import {
 *   ChangeViewModel,
 *   LoadsByReportingPeriod,
 *   PeriodStatus,
 *   PeriodStatusByChange,
 *   PeriodViewModel
 * } from './types.js'
 */

const ENHANCED_CHECK_VIEW_NAME = 'summary-log/enhanced-check'

const ZERO_TONNAGE = formatTonnage(0)

/**
 * Builds the view model for a single change type (added or adjusted). Tonnage
 * comes solely from the balance-affecting bucket; non-balance-affecting loads
 * do not move the waste balance, so they contribute count only. Returns null
 * when the total count is zero so the template can hide the section.
 * @param {PeriodStatusByChange} change
 * @returns {ChangeViewModel | null}
 */
const buildChangeViewModel = (change) => {
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
    balanceAffecting: { count: balanceAffecting.count },
    nonBalanceAffecting: { count: nonBalanceAffecting.count }
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
 * @returns {PeriodViewModel | null}
 */
const buildPeriodViewModel = (period) => {
  const added = buildChangeViewModel(period.added)
  const adjusted = buildChangeViewModel(period.adjusted)

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
 *   processingType?: string,
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

  const isAccredited =
    processingType !== PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY &&
    processingType !== PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY

  const open = buildPeriodViewModel(loadsByReportingPeriod.openPeriodLoads)
  const closed = buildPeriodViewModel(loadsByReportingPeriod.closedPeriodLoads)

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
