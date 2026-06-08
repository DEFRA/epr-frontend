import { PROCESSING_TYPES } from '#domain/summary-logs/meta-fields.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { LoadsByPeriodStatus, PeriodStatus } from './types.js'
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
 * Transforms a period's adjusted section into a view-friendly shape
 * with absolute tonnage and direction for the template.
 * @param {PeriodStatus['adjusted']} adjusted
 */
const buildAdjustedViewModel = (adjusted) => {
  if (!adjusted) {
    return null
  }
  return {
    tonnageDelta: adjusted.tonnageDelta,
    absoluteTonnage: Math.abs(adjusted.tonnageDelta),
    addsToBalance: adjusted.tonnageDelta >= 0
  }
}

/**
 * @param {PeriodStatus | null} period
 */
const buildPeriodViewModel = (period) => {
  if (!period) {
    return null
  }
  return {
    added: period.added,
    adjusted: buildAdjustedViewModel(period.adjusted)
  }
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

  const data = loadsByPeriodStatus ?? { open: null, closed: null }

  return {
    periodSections: {
      open: buildPeriodViewModel(data.open),
      closed: buildPeriodViewModel(data.closed)
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
