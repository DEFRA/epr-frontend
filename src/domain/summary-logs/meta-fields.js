// copied from matching file in epr-backend - keep in sync (as much as we need)

/**
 * Valid PROCESSING_TYPE values that can appear in summary log spreadsheets
 */
export const PROCESSING_TYPES = Object.freeze({
  EXPORTER_REGISTERED_ONLY: 'EXPORTER_REGISTERED_ONLY',
  EXPORTER: 'EXPORTER',
  REPROCESSOR_INPUT: 'REPROCESSOR_INPUT',
  REPROCESSOR_OUTPUT: 'REPROCESSOR_OUTPUT',
  REPROCESSOR_REGISTERED_ONLY: 'REPROCESSOR_REGISTERED_ONLY'
})

/** @typedef {typeof PROCESSING_TYPES[keyof typeof PROCESSING_TYPES]} ProcessingType */

export const REGISTERED_ONLY_PROCESSING_TYPES = new Set([
  PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY,
  PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY
])

/** @typedef {'EXPORTER_REGISTERED_ONLY' | 'REPROCESSOR_REGISTERED_ONLY'} RegisteredOnlyProcessingType */

/**
 * Whether a processing type is registered-only (no accreditation, so the check
 * page shows totals only rather than waste balance language). Accepts a widened
 * input so callers holding an optional or loosely-typed processingType need no
 * cast at the call site.
 * @param {ProcessingType | string | undefined} processingType
 * @returns {processingType is RegisteredOnlyProcessingType}
 */
export const isRegisteredOnlyProcessingType = (processingType) =>
  REGISTERED_ONLY_PROCESSING_TYPES.has(
    /** @type {RegisteredOnlyProcessingType} */ (processingType)
  )
