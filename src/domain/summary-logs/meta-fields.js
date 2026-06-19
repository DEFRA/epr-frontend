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

/** @typedef {'EXPORTER_REGISTERED_ONLY' | 'REPROCESSOR_REGISTERED_ONLY'} RegisteredOnlyProcessingType */

/** @typedef {'EXPORTER' | 'EXPORTER_REGISTERED_ONLY'} ExporterProcessingType */

/** @type {ReadonlySet<string>} */
const REGISTERED_ONLY_PROCESSING_TYPES = new Set([
  PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY,
  PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY
])

/** @type {ReadonlySet<string>} */
const EXPORTER_PROCESSING_TYPES = new Set([
  PROCESSING_TYPES.EXPORTER,
  PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY
])

/**
 * Whether a processing type is registered-only (no accreditation, so the check
 * page shows totals only rather than waste balance language).
 * @param {ProcessingType} processingType
 * @returns {processingType is RegisteredOnlyProcessingType}
 */
export const isRegisteredOnlyProcessingType = (processingType) =>
  REGISTERED_ONLY_PROCESSING_TYPES.has(processingType)

/**
 * Whether a processing type is an exporter variant. Exporters issue PERNs where
 * reprocessors issue PRNs, so some labelling differs by this.
 * @param {ProcessingType} processingType
 * @returns {processingType is ExporterProcessingType}
 */
export const isExporterType = (processingType) =>
  EXPORTER_PROCESSING_TYPES.has(processingType)
