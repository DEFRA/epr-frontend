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
 * change type (added or adjusted). Returns null when the bucket is empty
 * (total count is 0).
 * @param {PeriodStatusByChange} changeSection
 * @returns {{ count: number, tonnageDelta: number, absoluteTonnage: number, addsToBalance: boolean, included: { count: number }, excluded: { count: number } } | null}
 */
const buildChangeSectionViewModel = (changeSection) => {
  const count = changeSection.included.count + changeSection.excluded.count

  if (count === 0) {
    return null
  }

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

  if (!added && !adjusted) {
    return null
  }

  return { added, adjusted }
}

/**
 * Builds the view model for the enhanced check page from the BE
 * loadsByPeriodStatus payload.
 * @param {LoadsByPeriodStatus | undefined} loadsByPeriodStatus
 * @param {ProcessingType} [processingType]
 */
const buildEnhancedCheckViewModel = (loadsByPeriodStatus, processingType) => {
  const isAccredited =
    !!processingType && !isRegisteredOnlyProcessingType(processingType)

  if (!loadsByPeriodStatus) {
    return {
      periodSections: { open: null, closed: null },
      isAccredited
    }
  }

  return {
    periodSections: {
      open: buildPeriodViewModel(loadsByPeriodStatus.open),
      closed: buildPeriodViewModel(loadsByPeriodStatus.closed)
    },
    isAccredited
  }
}

/**
 * Renders the enhanced check page for validated summary logs.
 * Unified template for both accredited and registered-only processing types.
 * @param {ResponseToolkit} h
 * @param {(key: string, params?: object) => string} localise
 * @param {{ loadsByPeriodStatus?: LoadsByPeriodStatus, processingType?: ProcessingType, organisationId: string, registrationId: string, summaryLogId: string }} context
 * @returns {ResponseObject}
 */
export const renderEnhancedCheckView = (h, localise, context) => {
  const {
    loadsByPeriodStatus,
    processingType,
    organisationId,
    registrationId,
    summaryLogId
  } = context

  const { periodSections, isAccredited } = buildEnhancedCheckViewModel(
    loadsByPeriodStatus,
    processingType
  )

  return h.view(ENHANCED_CHECK_VIEW_NAME, {
    pageTitle: localise('summary-log:checkPageTitle'),
    organisationId,
    registrationId,
    summaryLogId,
    periodSections,
    isAccredited
  })
}
