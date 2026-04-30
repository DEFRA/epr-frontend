import { PROCESSING_TYPES } from '#domain/summary-logs/meta-fields.js'
import { WASTE_RECORD_TYPE } from '#domain/waste-records/model.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'
import {
  getDisplayCodeFromErrorCode,
  TECHNICAL_ERROR_DISPLAY_CODE
} from '#server/common/constants/validation-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'

/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { WasteRecordType } from '#domain/waste-records/model.js'
 * @import {
 *   LoadCategoryViewModel,
 *   LoadRows,
 *   LoadsViewModel,
 *   RawLoadCategory,
 *   RawLoads,
 *   RawLoadsByWasteRecordType,
 *   RegisteredOnlyLoadsSectionViewModel,
 *   SummaryLogParams,
 *   SummaryLogStatusResponse,
 *   SummaryLogsSession,
 *   ValidationResponse
 * } from './types.js'
 */

/**
 * @typedef {'EXPORTER_REGISTERED_ONLY' | 'REPROCESSOR_REGISTERED_ONLY'} RegisteredOnlyProcessingType
 */

/**
 * Context passed to every view resolver. Fields populated depend on the
 * backend status, so all data-bearing properties are optional and each
 * resolver destructures only what it needs.
 * @typedef {{
 *   status: string,
 *   validation?: ValidationResponse,
 *   accreditationNumber?: string,
 *   loads?: RawLoads,
 *   loadsByWasteRecordType?: RawLoadsByWasteRecordType,
 *   processingType?: ProcessingType,
 *   organisationId: string,
 *   registrationId: string,
 *   summaryLogId: string,
 *   pollUrl: string,
 *   uploadUrl?: string,
 *   cancelUrl: string,
 *   wasteBalance?: number
 * }} RenderContext
 */

const SECTION_BY_PROCESSING_TYPE_AND_WASTE_RECORD_TYPE = Object.freeze({
  [PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY]: Object.freeze({
    [WASTE_RECORD_TYPE.RECEIVED]:
      'registeredOnly.sectionReference.reprocessor.received',
    [WASTE_RECORD_TYPE.SENT_ON]:
      'registeredOnly.sectionReference.reprocessor.sentOn'
  }),
  [PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY]: Object.freeze({
    [WASTE_RECORD_TYPE.RECEIVED]:
      'registeredOnly.sectionReference.exporter.received',
    [WASTE_RECORD_TYPE.EXPORTED]:
      'registeredOnly.sectionReference.exporter.exported',
    [WASTE_RECORD_TYPE.SENT_ON]:
      'registeredOnly.sectionReference.exporter.sentOn'
  })
})

const WASTE_RECORD_TYPE_HEADING_KEY = Object.freeze({
  [WASTE_RECORD_TYPE.RECEIVED]: 'registeredOnly.sectionHeading.received',
  [WASTE_RECORD_TYPE.EXPORTED]: 'registeredOnly.sectionHeading.exported',
  [WASTE_RECORD_TYPE.PROCESSED]: 'registeredOnly.sectionHeading.processed',
  [WASTE_RECORD_TYPE.SENT_ON]: 'registeredOnly.sectionHeading.sentOn'
})

const WASTE_RECORD_TYPE_ORDER = Object.freeze({
  [WASTE_RECORD_TYPE.RECEIVED]: 1,
  [WASTE_RECORD_TYPE.PROCESSED]: 2,
  [WASTE_RECORD_TYPE.EXPORTED]: 3,
  [WASTE_RECORD_TYPE.SENT_ON]: 4
})

/** Waste record section number to display in UI copy, mapped by processing type */
const WASTE_RECORD_SECTION_BY_PROCESSING_TYPE = {
  [PROCESSING_TYPES.EXPORTER]: 1,
  [PROCESSING_TYPES.REPROCESSOR_INPUT]: 1,
  [PROCESSING_TYPES.REPROCESSOR_OUTPUT]: 3
}

const PROCESSING_STATES = new Set([
  summaryLogStatuses.preprocessing,
  summaryLogStatuses.validating,
  summaryLogStatuses.submitting
])

const REUPLOAD_STATES = new Set([
  summaryLogStatuses.invalid,
  summaryLogStatuses.rejected,
  summaryLogStatuses.validationFailed,
  summaryLogStatuses.submissionFailed
])

/**
 * Gets the waste record section number to display in UI copy based on processing type
 * @param {ProcessingType} [processingType] - Processing type from summary log meta
 * @returns {number | undefined} Waste record section number (1 or 3)
 */
export const getWasteRecordSectionNumber = (processingType) => {
  return processingType === undefined
    ? undefined
    : WASTE_RECORD_SECTION_BY_PROCESSING_TYPE[processingType]
}

/**
 * @param {ProcessingType} [processingType]
 * @returns {processingType is RegisteredOnlyProcessingType}
 */
const isRegisteredOnlyProcessingType = (processingType) =>
  processingType === PROCESSING_TYPES.EXPORTER_REGISTERED_ONLY ||
  processingType === PROCESSING_TYPES.REPROCESSOR_REGISTERED_ONLY

const VIEW_NAME = 'summary-log/progress'
const CHECK_VIEW_NAME = 'summary-log/check'
const SUBMITTING_VIEW_NAME = 'summary-log/submitting'
const SUCCESS_VIEW_NAME = 'summary-log/success'
const SUPERSEDED_VIEW_NAME = 'summary-log/superseded'
const VALIDATION_FAILURES_VIEW_NAME = 'summary-log/validation-failures'
const PAGE_TITLE_KEY = 'summary-log:pageTitle'
const MAX_FILE_SIZE_MB = 100

/** @type {LoadRows} */
const NO_ROWS = { count: 0, rowIds: [] }

/**
 * Builds view model for a single load category (added or adjusted)
 * @param {RawLoadCategory} [category] - Category data from backend (e.g. loads.added)
 * @returns {LoadCategoryViewModel}
 */
const buildCategoryViewModel = (category) => {
  const included = category?.included ?? NO_ROWS
  const excluded = category?.excluded ?? NO_ROWS

  return {
    included,
    excluded,
    total: included.count + excluded.count
  }
}

/**
 * Transforms raw loads data from backend into a view model
 * Uses count from backend (not array lengths) because rowIds arrays are truncated at 100 items
 * @param {RawLoads} [loads] - Raw loads data from backend API
 * @returns {LoadsViewModel}
 */
export const buildLoadsViewModel = (loads) => {
  return {
    added: buildCategoryViewModel(loads?.added),
    adjusted: buildCategoryViewModel(loads?.adjusted)
  }
}

/**
 * @param {ProcessingType} processingType
 * @param {WasteRecordType} wasteRecordType
 * @returns {string|undefined}
 */
const getSectionReferenceKey = (processingType, wasteRecordType) =>
  SECTION_BY_PROCESSING_TYPE_AND_WASTE_RECORD_TYPE[processingType]?.[
    wasteRecordType
  ]

/**
 * @param {ProcessingType} processingType
 * @param {WasteRecordType} wasteRecordType
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const getSectionReference = (processingType, wasteRecordType, localise) => {
  const key = getSectionReferenceKey(processingType, wasteRecordType)

  return localise(`summary-log:${key}`)
}

/**
 * Transforms raw loadsByWasteRecordType into view model sections
 * @param {RawLoadsByWasteRecordType} loadsByWasteRecordType
 * @param {ProcessingType} processingType
 * @param {(key: string) => string} localise
 * @returns {RegisteredOnlyLoadsSectionViewModel[]}
 */
export const buildLoadsByWasteRecordTypeViewModel = (
  loadsByWasteRecordType,
  processingType,
  localise
) =>
  loadsByWasteRecordType
    .filter(({ wasteRecordType }) =>
      getSectionReferenceKey(processingType, wasteRecordType)
    )
    .toSorted(
      (a, b) =>
        WASTE_RECORD_TYPE_ORDER[a.wasteRecordType] -
        WASTE_RECORD_TYPE_ORDER[b.wasteRecordType]
    )
    .map(({ wasteRecordType, added, adjusted }) => ({
      headingKey: WASTE_RECORD_TYPE_HEADING_KEY[wasteRecordType],
      sectionReference: getSectionReference(
        processingType,
        wasteRecordType,
        localise
      ),
      added: { count: added.valid.count, rowIds: added.valid.rowIds },
      adjusted: { count: adjusted.valid.count, rowIds: adjusted.valid.rowIds }
    }))

/**
 * Gets view data for progress page (processing or error states)
 * @param {(key: string) => string} localise - The i18n translation function
 * @param {string} status - Backend status
 * @returns {{heading: string, message: string, isProcessing: boolean}}
 */
const getProgressViewData = (localise, status) => {
  if (PROCESSING_STATES.has(status)) {
    return {
      heading: localise('summary-log:processingHeading'),
      message: localise('summary-log:processingMessage'),
      isProcessing: true
    }
  }

  // Fallback for unexpected statuses (should not occur in normal flow)
  return {
    heading: localise('summary-log:errorHeading'),
    message: localise('summary-log:errorMessage'),
    isProcessing: false
  }
}

/**
 * Gets status data from session (if fresh) or backend API
 * @param {HapiRequest} request - Hapi request object
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @param {string} summaryLogId - Summary log ID
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<SummaryLogStatusResponse>}
 */
const getStatusData = async (
  request,
  organisationId,
  registrationId,
  summaryLogId,
  idToken
) => {
  /** @type {SummaryLogsSession | null} */
  const storedSession = request.yar.get(sessionNames.summaryLogs)
  const summaryLogsSession = storedSession ?? {}
  const freshDataMap = summaryLogsSession.freshDataMap
  const freshData = freshDataMap?.[summaryLogId]

  const data =
    freshData ??
    (await fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
      idToken
    }))

  if (freshDataMap !== undefined && summaryLogId in freshDataMap) {
    const { [summaryLogId]: _, ...remainingMap } = freshDataMap // NOSONAR(javascript:S1481) intentional discard via destructure-rest
    request.yar.set(sessionNames.summaryLogs, {
      ...summaryLogsSession,
      freshDataMap: remainingMap
    })
  }

  const {
    accreditationNumber,
    loads,
    loadsByWasteRecordType,
    processingType,
    status,
    validation
  } = data

  return {
    accreditationNumber,
    loads,
    loadsByWasteRecordType,
    processingType,
    status,
    validation
  }
}

/**
 * Renders the check page for validated summary logs. A registered-only
 * processing type is always paired with loadsByWasteRecordType by the
 * backend; if that invariant breaks we throw rather than silently
 * falling through to the non-registered view, which would render a
 * misleading empty page.
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderCheckView = (
  h,
  localise,
  {
    loads,
    loadsByWasteRecordType,
    organisationId,
    registrationId,
    summaryLogId,
    processingType
  }
) => {
  if (isRegisteredOnlyProcessingType(processingType)) {
    if (loadsByWasteRecordType === undefined) {
      throw new Error(
        `Expected loadsByWasteRecordType for registered-only processing type ${processingType}`
      )
    }
    return h.view('summary-log/check-registered-only', {
      pageTitle: localise('summary-log:checkPageTitle'),
      organisationId,
      registrationId,
      summaryLogId,
      sections: buildLoadsByWasteRecordTypeViewModel(
        loadsByWasteRecordType,
        processingType,
        localise
      )
    })
  }

  const loadsViewModel = buildLoadsViewModel(loads)
  const sectionNumber = getWasteRecordSectionNumber(processingType)

  return h.view(CHECK_VIEW_NAME, {
    pageTitle: localise('summary-log:checkPageTitle'),
    organisationId,
    registrationId,
    summaryLogId,
    loads: loadsViewModel,
    sectionNumber
  })
}

/**
 * Renders the submitting page while submission is in progress
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSubmittingView = (h, localise, { pollUrl }) => {
  return h.view(SUBMITTING_VIEW_NAME, {
    pageTitle: localise(PAGE_TITLE_KEY),
    heading: localise('summary-log:submittingHeading'),
    message: localise('summary-log:submittingMessage'),
    isProcessing: true,
    shouldPoll: true,
    pollUrl
  })
}

/**
 * Renders the success page after successful submission
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSuccessView = (h, localise, { organisationId, wasteBalance }) => {
  return h.view(SUCCESS_VIEW_NAME, {
    pageTitle: localise('summary-log:successPageTitle'),
    organisationId,
    wasteBalance
  })
}

/**
 * Renders the superseded page for summary logs replaced by a newer upload
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSupersededView = (
  h,
  localise,
  { organisationId, registrationId }
) => {
  return h.view(SUPERSEDED_VIEW_NAME, {
    pageTitle: localise(PAGE_TITLE_KEY),
    organisationId,
    registrationId
  })
}

const buildRowRemovedIssue = (rowRemovedFailures, localise) => {
  if (rowRemovedFailures.length === 0) {
    return []
  }

  const sheets = [
    ...new Set(
      rowRemovedFailures.map(({ location }) => location?.sheet ?? 'Unknown')
    )
  ]

  return [
    {
      type: 'sequentialRowRemoved',
      preamble: localise('summary-log:failure.SEQUENTIAL_ROW_REMOVED_PREAMBLE'),
      sheets,
      closing: localise('summary-log:failure.SEQUENTIAL_ROW_REMOVED_CLOSING')
    }
  ]
}

const buildOtherIssueMessages = (otherFailures, localise, fallbackMessage) => {
  if (otherFailures.length === 0) {
    return []
  }

  return [
    ...new Set(
      otherFailures.map(({ errorCode, location }) => {
        const displayCode = getDisplayCodeFromErrorCode(
          errorCode,
          location?.header
        )
        return localise(`summary-log:failure.${displayCode}`, {
          defaultValue: fallbackMessage,
          maxSize: MAX_FILE_SIZE_MB
        })
      })
    )
  ]
}

const applyFallback = (combinedIssues, fallbackMessage) => {
  if (combinedIssues.length === 0) {
    return [fallbackMessage]
  }

  if (combinedIssues.length > 1) {
    return combinedIssues.filter((issue) => issue !== fallbackMessage)
  }

  return combinedIssues
}

/**
 * Renders the validation failures page for invalid summary logs
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string, params?: object) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderValidationFailuresView = (
  h,
  localise,
  { validation, uploadUrl, cancelUrl }
) => {
  const failures = validation?.failures ?? []

  const fallbackMessage = localise(
    `summary-log:failure.${TECHNICAL_ERROR_DISPLAY_CODE}`
  )

  const rowRemovedFailures = failures.filter(
    ({ errorCode }) => errorCode === 'SEQUENTIAL_ROW_REMOVED'
  )
  const otherFailures = failures.filter(
    ({ errorCode }) => errorCode !== 'SEQUENTIAL_ROW_REMOVED'
  )

  const combinedIssues = [
    ...buildRowRemovedIssue(rowRemovedFailures, localise),
    ...buildOtherIssueMessages(otherFailures, localise, fallbackMessage)
  ]

  const issues = applyFallback(combinedIssues, fallbackMessage)

  const issueCount = issues.length

  return h.view(VALIDATION_FAILURES_VIEW_NAME, {
    pageTitle: localise(PAGE_TITLE_KEY),
    heading: localise('summary-log:validationFailuresHeading'),
    description1: localise('summary-log:validationFailuresDescription1', {
      count: issueCount
    }),
    description2: localise('summary-log:validationFailuresDescription2', {
      count: issueCount
    }),
    issues,
    fileUploadLabel: localise('summary-log:reuploadFileLabel'),
    buttonText: localise('summary-log:reuploadButtonText'),
    cancelUrl,
    cancelButtonText: localise('summary-log:cancelButtonText'),
    uploadUrl
  })
}

/**
 * Renders the progress page for processing states or unexpected statuses
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderProgressView = (h, localise, { status, pollUrl }) => {
  const viewData = getProgressViewData(localise, status)

  return h.view(VIEW_NAME, {
    ...viewData,
    pageTitle: localise(PAGE_TITLE_KEY),
    shouldPoll: PROCESSING_STATES.has(status),
    pollUrl
  })
}

/**
 * View resolver mapping - maps backend statuses to their render functions
 * @type {Record<string, (
 *   h: ResponseToolkit,
 *   localise: (key: string, params?: object) => string,
 *   context: RenderContext
 * ) => ResponseObject>}
 */
const viewResolvers = {
  [summaryLogStatuses.validated]: renderCheckView,
  [summaryLogStatuses.submitting]: renderSubmittingView,
  [summaryLogStatuses.submitted]: renderSuccessView,
  [summaryLogStatuses.superseded]: renderSupersededView,
  [summaryLogStatuses.invalid]: renderValidationFailuresView,
  [summaryLogStatuses.rejected]: renderValidationFailuresView,
  [summaryLogStatuses.validationFailed]: renderValidationFailuresView,
  [summaryLogStatuses.submissionFailed]: renderValidationFailuresView
}

/**
 * Renders appropriate view based on status
 * @param {{
 *   h: ResponseToolkit,
 *   localise: (key: string, params?: object) => string
 * } & RenderContext} options - Rendering options
 * @returns {ResponseObject} Hapi view response
 */
const renderViewForStatus = (options) => {
  const { h, localise, status } = options
  const resolver = viewResolvers[status] ?? renderProgressView

  return resolver(h, localise, options)
}

/**
 * Gets a pre-signed upload URL for re-uploading a summary log
 * @param {string} status - Current summary log status
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @param {string} redirectUrl - URL to redirect to after upload (with {summaryLogId} placeholder)
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<{uploadUrl?: string}>} Upload URL, or empty object if not needed
 */
const getUploadUrl = async (
  status,
  organisationId,
  registrationId,
  redirectUrl,
  idToken
) => {
  if (!REUPLOAD_STATES.has(status)) {
    return {}
  }

  const { uploadUrl } = await initiateSummaryLogUpload({
    organisationId,
    registrationId,
    redirectUrl,
    idToken
  })

  return { uploadUrl }
}

/**
 * Gets waste balance data for a submitted summary log
 * @param {string} status - Current summary log status
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @param {string} idToken - JWT ID token for authorization
 * @param {import('#server/common/helpers/logging/logger.js').TypedLogger} logger - Request logger
 * @returns {Promise<{wasteBalance?: number}>} Waste balance, or empty object if not applicable
 */
const getWasteBalanceData = async (
  status,
  organisationId,
  registrationId,
  idToken,
  logger
) => {
  if (status !== summaryLogStatuses.submitted) {
    return {}
  }

  try {
    const { registration } = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    if (!registration.accreditationId) {
      return {}
    }

    const wasteBalances = await fetchWasteBalances(
      organisationId,
      [registration.accreditationId],
      idToken
    )

    const balance = wasteBalances[registration.accreditationId]

    if (!balance) {
      return {}
    }

    return { wasteBalance: balance.availableAmount }
  } catch (error) {
    if (error.isBoom) {
      throw error
    }
    logger.error({ err: error }, 'Failed to fetch waste balance data')
    return {}
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadProgressController = {
  /**
   * @param {HapiRequest & { params: SummaryLogParams }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId, summaryLogId } = request.params

    const session = request.auth.credentials

    request.logger.info(
      `Rendering summary log progress page for ${summaryLogId} - status load started`
    )

    const {
      accreditationNumber,
      loads,
      loadsByWasteRecordType,
      processingType,
      status,
      validation
    } = await getStatusData(
      request,
      organisationId,
      registrationId,
      summaryLogId,
      session.idToken
    )

    request.logger.info(
      `Rendering summary log progress page for ${summaryLogId} - status load completed`
    )

    const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}`
    const pollUrl = `${baseUrl}/summary-logs/${summaryLogId}`
    const redirectUrl = `${baseUrl}/summary-logs/{summaryLogId}`
    const cancelUrl = baseUrl

    const { uploadUrl } = await getUploadUrl(
      status,
      organisationId,
      registrationId,
      redirectUrl,
      session.idToken
    )

    const { wasteBalance } = await getWasteBalanceData(
      status,
      organisationId,
      registrationId,
      session.idToken,
      request.logger
    )

    return renderViewForStatus({
      h,
      localise,
      status,
      validation,
      accreditationNumber,
      loads,
      loadsByWasteRecordType,
      processingType,
      organisationId,
      registrationId,
      summaryLogId,
      pollUrl,
      uploadUrl,
      cancelUrl,
      wasteBalance
    })
  }
}

/**
 * @import { ResponseObject, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
