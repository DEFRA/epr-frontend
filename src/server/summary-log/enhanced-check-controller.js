import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { PROCESSING_TYPES } from '#domain/summary-logs/meta-fields.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { LoadsByPeriodStatus, PeriodStatus, PeriodStatusByChange } from './types.js'
 */

const ENHANCED_CHECK_VIEW_NAME = 'summary-log/enhanced-check'

// The rendered figure for a zero tonnage, used to decide whether the
// tonnage sentence is worth showing. Derived from formatTonnage so the
// check can never drift from what the template actually prints.
const ZERO_TONNAGE = formatTonnage(0)

/**
 * @param {ProcessingType} [processingType]
 * @returns {boolean}
 */
const isRegisteredOnlyProcessingType = (processingType) =>
  processingType === PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY ||
  processingType === PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY

/**
 * Flattens the BE's balanceAffecting/nonBalanceAffecting shape into a view
 * model for a single change type (added or adjusted).
 * @param {PeriodStatusByChange} changeSection
 * @returns {{ count: number, tonnageDelta: string, absoluteTonnage: string, addsToBalance: boolean, hasTonnageDelta: boolean, balanceAffecting: { count: number }, nonBalanceAffecting: { count: number } }}
 */
const buildChangeSectionViewModel = (changeSection) => {
  const count =
    changeSection.balanceAffecting.count +
    changeSection.nonBalanceAffecting.count

  const tonnageDelta =
    changeSection.balanceAffecting.tonnageDelta +
    changeSection.nonBalanceAffecting.tonnageDelta
  const absoluteTonnage = formatTonnage(Math.abs(tonnageDelta))

  return {
    count,
    tonnageDelta: formatTonnage(tonnageDelta),
    absoluteTonnage,
    addsToBalance: tonnageDelta >= 0,
    // Hide the sentence whenever the figure we would print is zero, so a
    // net delta that rounds to "0.00" never produces "will add 0.00 tonnes".
    hasTonnageDelta: absoluteTonnage !== ZERO_TONNAGE,
    balanceAffecting: { count: changeSection.balanceAffecting.count },
    nonBalanceAffecting: { count: changeSection.nonBalanceAffecting.count }
  }
}

/**
 * @param {PeriodStatus} period
 */
const buildPeriodViewModel = (period) => {
  const added = buildChangeSectionViewModel(period.added)
  const adjusted = buildChangeSectionViewModel(period.adjusted)

  if (added.count === 0 && adjusted.count === 0) {
    return null
  }

  return { added, adjusted }
}

/**
 * Sums the raw tonnage delta across all periods and change types.
 * @param {LoadsByPeriodStatus} loadsByPeriodStatus
 * @returns {number}
 */
const computeTotalTonnageDelta = (loadsByPeriodStatus) => {
  let total = 0
  for (const period of [loadsByPeriodStatus.open, loadsByPeriodStatus.closed]) {
    for (const change of [period.added, period.adjusted]) {
      total +=
        change.balanceAffecting.tonnageDelta +
        change.nonBalanceAffecting.tonnageDelta
    }
  }
  return total
}

/**
 * Builds the projected waste balance view model for accredited users.
 * @param {number | undefined} currentBalance
 * @param {LoadsByPeriodStatus} loadsByPeriodStatus
 * @returns {{ currentBalance: string, projectedBalance: string } | null}
 */
const buildWasteBalanceProjection = (currentBalance, loadsByPeriodStatus) => {
  if (currentBalance === undefined) {
    return null
  }

  const totalDelta = computeTotalTonnageDelta(loadsByPeriodStatus)
  const projected = currentBalance + totalDelta

  return {
    currentBalance: formatTonnage(currentBalance),
    projectedBalance: formatTonnage(projected)
  }
}

/**
 * Builds the view model for the enhanced check page from the BE
 * loadsByPeriodStatus payload.
 * @param {LoadsByPeriodStatus | undefined} loadsByPeriodStatus
 * @param {ProcessingType} [processingType]
 * @param {number} [wasteBalance]
 */
const buildEnhancedCheckViewModel = (
  loadsByPeriodStatus,
  processingType,
  wasteBalance
) => {
  const isAccredited =
    !!processingType && !isRegisteredOnlyProcessingType(processingType)

  if (!loadsByPeriodStatus) {
    return {
      periodSections: { open: null, closed: null },
      isAccredited,
      wasteBalanceProjection: null
    }
  }

  return {
    periodSections: {
      open: buildPeriodViewModel(loadsByPeriodStatus.open),
      closed: buildPeriodViewModel(loadsByPeriodStatus.closed)
    },
    isAccredited,
    wasteBalanceProjection: isAccredited
      ? buildWasteBalanceProjection(wasteBalance, loadsByPeriodStatus)
      : null
  }
}

/**
 * Renders the enhanced check page for validated summary logs.
 * Unified template for both accredited and registered-only processing types.
 * @param {ResponseToolkit} h
 * @param {(key: string, params?: object) => string} localise
 * @param {{ loadsByPeriodStatus?: LoadsByPeriodStatus, processingType?: ProcessingType, organisationId: string, registrationId: string, summaryLogId: string, wasteBalance?: number }} context
 * @returns {ResponseObject}
 */
export const renderEnhancedCheckView = (h, localise, context) => {
  const {
    loadsByPeriodStatus,
    processingType,
    organisationId,
    registrationId,
    summaryLogId,
    wasteBalance
  } = context

  const { periodSections, isAccredited, wasteBalanceProjection } =
    buildEnhancedCheckViewModel(
      loadsByPeriodStatus,
      processingType,
      wasteBalance
    )

  return h.view(ENHANCED_CHECK_VIEW_NAME, {
    pageTitle: localise('summary-log:checkPageTitle'),
    organisationId,
    registrationId,
    summaryLogId,
    periodSections,
    isAccredited,
    wasteBalanceProjection
  })
}
