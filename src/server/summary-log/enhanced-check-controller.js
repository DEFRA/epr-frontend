import { REGISTERED_ONLY_PROCESSING_TYPES } from '#domain/summary-logs/meta-fields.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { LoadsByPeriodStatus } from './types.js'
 */

const ENHANCED_CHECK_VIEW_NAME = 'summary-log/enhanced-check'

/**
 * Builds the view model for the enhanced check page from the BE
 * loadsByPeriodStatus payload.
 * @param {LoadsByPeriodStatus | undefined} loadsByPeriodStatus
 * @param {string | undefined} processingType
 */
const buildEnhancedCheckViewModel = (loadsByPeriodStatus, processingType) => {
  const isAccredited =
    !!processingType && !REGISTERED_ONLY_PROCESSING_TYPES.has(processingType)

  const periodSections = loadsByPeriodStatus ?? { open: null, closed: null }

  return {
    periodSections,
    isAccredited
  }
}

/**
 * Renders the enhanced check page for validated summary logs.
 * Unified template for both accredited and registered-only processing types.
 * @param {ResponseToolkit} h
 * @param {(key: string, params?: object) => string} localise
 * @param {{ loadsByPeriodStatus?: LoadsByPeriodStatus, processingType?: string, organisationId: string, registrationId: string, summaryLogId: string }} context
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
