import { isClosedPeriodAdjustmentsEnabled } from '#config/config.js'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { CLASSIFICATION_REASON } from '#domain/summary-logs/classification-reason.js'
import { MAX_ROWS_PER_BUCKET } from '#domain/summary-logs/loads-schema.js'
import {
  isExporterType,
  isRegisteredOnlyProcessingType
} from '#domain/summary-logs/meta-fields.js'
import { WASTE_RECORD_TYPE } from '#domain/waste-records/model.js'
import { hasClosedPeriodChanges } from './closed-period-changes.js'

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { WasteRecordType } from '#domain/waste-records/model.js'
 * @import {
 *   ChangeViewModel,
 *   LoadRow,
 *   LoadRowViewModel,
 *   LoadSectionViewModel,
 *   Localise,
 *   LoadsByReportingPeriod,
 *   PeriodStatus,
 *   PeriodStatusByChange,
 *   PeriodViewModel
 * } from './types.js'
 */

const ENHANCED_CHECK_VIEW_NAME = 'summary-log/enhanced-check'

const ZERO_TONNAGE = formatTonnage(0)

/**
 * Order sections are listed in, following the summary log's flow rather than
 * the WASTE_RECORD_TYPE enum's alphabetical order.
 * @type {WasteRecordType[]}
 */
const SECTION_ORDER = [
  WASTE_RECORD_TYPE.RECEIVED,
  WASTE_RECORD_TYPE.PROCESSED,
  WASTE_RECORD_TYPE.EXPORTED,
  WASTE_RECORD_TYPE.SENT_ON
]

/**
 * Exclusion codes that resolve to a fixed reason string (PRN_ISSUED varies).
 * @type {ReadonlySet<string>}
 */
const FIXED_REASON_CODES = new Set([
  CLASSIFICATION_REASON.MISSING_REQUIRED_FIELD,
  CLASSIFICATION_REASON.PRODUCT_WEIGHT_NOT_ADDED,
  CLASSIFICATION_REASON.ORS_NOT_APPROVED
])

/**
 * Locale key under enhanced.reason for one exclusion code, or null when the
 * code has no mapping (the caller then falls back to the raw code rather than
 * a translation).
 * @param {string} code
 * @param {ProcessingType} processingType
 * @returns {string | null}
 */
const reasonKey = (code, processingType) => {
  if (code === CLASSIFICATION_REASON.PRN_ISSUED) {
    return isExporterType(processingType) ? 'PERN_ISSUED' : 'PRN_ISSUED'
  }
  return FIXED_REASON_CODES.has(code) ? code : null
}

/**
 * Joins the load's distinct exclusion reasons into one display string, or null
 * when it carries none (an included load). A code we have no translation for
 * falls back to the raw backend const rather than being dropped, so a new
 * backend reason still surfaces something to the operator.
 * @param {string[]} exclusionReasons
 * @param {ProcessingType} processingType
 * @param {Localise} localise
 * @returns {string | null}
 */
const resolveReasonText = (exclusionReasons, processingType, localise) => {
  const texts = exclusionReasons.map((code) => {
    const key = reasonKey(code, processingType)
    return key === null ? code : localise(`summary-log:enhanced.reason.${key}`)
  })
  return texts.length > 0 ? texts.join(', ') : null
}

/**
 * Projects one backend row into a view row: the row id and (only where the
 * design surfaces it) the exclusion reason text. The worksheet (tab) name is
 * carried by the enclosing section, not the row. Adjusted loads list the row id
 * alone, so includeReason is false for them even when the row carries codes.
 * @param {LoadRow} row
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @param {boolean} includeReason
 * @returns {LoadRowViewModel}
 */
const mapLoadRow = (
  { rowId, exclusionReasons },
  { processingType, localise },
  includeReason
) => ({
  rowId,
  reasonText: includeReason
    ? resolveReasonText(exclusionReasons, processingType, localise)
    : null
})

/**
 * Localised worksheet (tab) name for a waste record type, used as the section
 * label grouping the rows that belong to that tab.
 * @param {WasteRecordType} wasteRecordType
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @returns {string}
 */
const sectionLabel = (wasteRecordType, { processingType, localise }) =>
  localise(
    `summary-log:enhanced.worksheet.${processingType}.${wasteRecordType}`
  )

/**
 * Groups a bucket's rows into sections by waste record type, in the canonical
 * summary-log flow order (SECTION_ORDER). Empty sections are dropped, so only
 * sections that carry rows are labelled. Buckets always carry a rows array from
 * the backend, but tolerate its absence (older fixtures) by treating it as empty.
 * @param {LoadRow[] | undefined} rows
 * @param {{ processingType: ProcessingType, localise: Localise }} ctx
 * @param {boolean} includeReason
 * @returns {LoadSectionViewModel[]}
 */
const groupRowsIntoSections = (rows, ctx, includeReason) =>
  SECTION_ORDER.map((wasteRecordType) => {
    const sectionRows = (rows ?? []).filter(
      (row) => row.wasteRecordType === wasteRecordType
    )
    return sectionRows.length === 0
      ? null
      : {
          sectionName: sectionLabel(wasteRecordType, ctx),
          rows: sectionRows.map((row) => mapLoadRow(row, ctx, includeReason))
        }
  }).filter((section) => section !== null)

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

  // The withData heading direction is computed from its own delta. The
  // withoutData heading hardcodes "reduced" in copy, which holds because a
  // missing-data row only reaches a balance-affecting bucket by reversing its
  // earlier contribution: the backend zeroes an excluded row's amount, so the
  // adjusted leg is -oldAmount (negative). See period-status.js in epr-backend.
  return {
    count: bucket.count,
    withData: {
      addsToBalance: withDataDelta >= 0,
      count: withData.length,
      sections: groupRowsIntoSections(withData, ctx, false)
    },
    withoutData: {
      count: withoutData.length,
      sections: groupRowsIntoSections(withoutData, ctx, false)
    }
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
 * @param {keyof PeriodStatus} changeKind
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
      sections: groupRowsIntoSections(
        nonBalanceAffecting.rows,
        ctx,
        changeKind === 'added'
      )
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
 * only when the balance is unavailable. When the net delta rounds to zero the
 * panel still shows, flagged `unchanged` so the template reads "will still be".
 * @param {boolean} isAccredited
 * @param {number | undefined} wasteBalance - Current available waste balance
 * @param {LoadsByReportingPeriod} loadsByReportingPeriod
 * @returns {{ current: string, projected: string, unchanged: boolean } | null}
 */
const buildWasteBalanceProjection = (
  isAccredited,
  wasteBalance,
  loadsByReportingPeriod
) => {
  if (!isAccredited || wasteBalance === undefined) {
    return null
  }

  const netDelta =
    periodBalanceDelta(loadsByReportingPeriod.openPeriodLoads) +
    periodBalanceDelta(loadsByReportingPeriod.closedPeriodLoads)

  // Compare on the rounded (2dp) value rather than === 0: the delta is a sum of
  // up to four floats, so exact cancellation can leave a sub-penny residue, and
  // a real delta below half a penny rounds away to nothing visible anyway.
  const unchanged = formatTonnage(netDelta) === ZERO_TONNAGE

  return {
    current: formatTonnage(wasteBalance),
    projected: formatTonnage(wasteBalance + netDelta),
    unchanged
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
    maxRowsPerBucket: MAX_ROWS_PER_BUCKET,
    periodSections: { open, closed },
    isEmpty: open === null && closed === null,
    showClosedPeriodImportant:
      isClosedPeriodAdjustmentsEnabled() &&
      hasClosedPeriodChanges(loadsByReportingPeriod),
    wasteBalanceProjection: buildWasteBalanceProjection(
      isAccredited,
      wasteBalance,
      loadsByReportingPeriod
    )
  })
}
