import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { PROCESSING_TYPES } from '#domain/summary-logs/meta-fields.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { LoadsByPeriodStatus, PeriodStatus, PeriodStatusByChange } from './types.js'
 */

const ENHANCED_CHECK_VIEW_NAME = 'summary-log/enhanced-check'

/**
 * @param {ProcessingType} [processingType]
 * @returns {boolean}
 */
const isRegisteredOnlyProcessingType = (processingType) =>
  processingType === PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY ||
  processingType === PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY

/**
 * Flattens the BE's included/excluded shape into a view model for a single
 * change type (added or adjusted).
 * @param {PeriodStatusByChange} changeSection
 * @returns {{ count: number, tonnageDelta: string, absoluteTonnage: string, addsToBalance: boolean, included: { count: number }, excluded: { count: number } }}
 */
const buildChangeSectionViewModel = (changeSection) => {
  const count = changeSection.included.count + changeSection.excluded.count

  const tonnageDelta =
    changeSection.included.tonnageDelta + changeSection.excluded.tonnageDelta

  return {
    count,
    tonnageDelta: formatTonnage(tonnageDelta),
    absoluteTonnage: formatTonnage(Math.abs(tonnageDelta)),
    addsToBalance: tonnageDelta >= 0,
    included: { count: changeSection.included.count },
    excluded: { count: changeSection.excluded.count }
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
      total += change.included.tonnageDelta + change.excluded.tonnageDelta
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
