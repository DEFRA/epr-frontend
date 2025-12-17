import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import {
  validationFailureCodes,
  DATA_ENTRY_CODES,
  DATA_ENTRY_DISPLAY_CODE
} from '#server/common/constants/validation-codes.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/** Waste record section number to display in UI copy, mapped by processing type */
const WASTE_RECORD_SECTION_BY_PROCESSING_TYPE = {
  EXPORTER: 1,
  REPROCESSOR_INPUT: 1,
  REPROCESSOR_OUTPUT: 3
}

const PROCESSING_STATES = new Set([
  summaryLogStatuses.preprocessing,
  summaryLogStatuses.validating,
  summaryLogStatuses.submitting
])

const REUPLOAD_STATES = new Set([
  summaryLogStatuses.invalid,
  summaryLogStatuses.rejected,
  summaryLogStatuses.validationFailed
])

/**
 * Gets the waste record section number to display in UI copy based on processing type
 * @param {string} processingType - Processing type from summary log meta
 * @returns {number} Waste record section number (1 or 3)
 */
export const getWasteRecordSectionNumber = (processingType) => {
  return WASTE_RECORD_SECTION_BY_PROCESSING_TYPE[processingType]
}

const VIEW_NAME = 'summary-log/progress'
const CHECK_VIEW_NAME = 'summary-log/check'
const SUBMITTING_VIEW_NAME = 'summary-log/submitting'
const SUCCESS_VIEW_NAME = 'summary-log/success'
const SUPERSEDED_VIEW_NAME = 'summary-log/superseded'
const VALIDATION_FAILURES_VIEW_NAME = 'summary-log/validation-failures'
const PAGE_TITLE_KEY = 'summary-log:pageTitle'

const NO_ROWS = { count: 0, rowIds: [] }

/**
 * Builds view model for a single load category (added or adjusted)
 * @param {object} [category] - Category data from backend (e.g. loads.added)
 * @returns {object} View model with included/excluded objects and total
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
 * @param {object} [loads] - Raw loads data from backend API
 * @returns {object} View model with row IDs and counts
 */
export const buildLoadsViewModel = (loads) => {
  return {
    added: buildCategoryViewModel(loads?.added),
    adjusted: buildCategoryViewModel(loads?.adjusted)
  }
}

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
 * @param {object} request - Hapi request object
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @param {string} summaryLogId - Summary log ID
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<{status: string, validation?: object, accreditationNumber?: string, loads?: object}>}
 */
const getStatusData = async (
  request,
  organisationId,
  registrationId,
  summaryLogId,
  idToken
) => {
  // Check session for fresh data first (prevents race condition after POST submit)
  const summaryLogsSession = request.yar.get(sessionNames.summaryLogs) || {}
  const { freshData, uploadId } = summaryLogsSession

  const data =
    freshData ??
    (await fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
      uploadId,
      idToken
    }))

  if (freshData) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { freshData: _, ...remainingSession } = summaryLogsSession
    request.yar.set(sessionNames.summaryLogs, remainingSession)
  }

  const { status, validation, accreditationNumber, loads, processingType } =
    data

  return {
    status,
    validation,
    accreditationNumber,
    loads,
    processingType
  }
}

/**
 * Renders the check page for validated summary logs
 * @param {object} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {object} context - View context
 * @param {object} context.loads - Load statistics for the summary log
 * @param {string} context.organisationId - Organisation ID
 * @param {string} context.registrationId - Registration ID
 * @param {string} context.summaryLogId - Summary log ID
 * @param {string} [context.processingType] - Processing type from summary log meta
 * @returns {object} Hapi view response
 */
const renderCheckView = (
  h,
  localise,
  { loads, organisationId, registrationId, summaryLogId, processingType }
) => {
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
 * @param {object} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {object} context - View context
 * @param {string} context.pollUrl - URL for polling submission status
 * @returns {object} Hapi view response
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
 * @param {object} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {object} context - View context
 * @param {string} context.organisationId - Organisation ID
 * @param {string} context.registrationId - Registration ID
 * @param {string} context.accreditationNumber - Accreditation number for display
 * @returns {object} Hapi view response
 */
const renderSuccessView = (
  h,
  localise,
  { organisationId, registrationId, accreditationNumber }
) => {
  return h.view(SUCCESS_VIEW_NAME, {
    pageTitle: localise('summary-log:successPageTitle'),
    organisationId,
    registrationId,
    accreditationNumber
  })
}

/**
 * Renders the superseded page for summary logs replaced by a newer upload
 * @param {object} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {object} context - View context
 * @param {string} context.organisationId - Organisation ID
 * @param {string} context.registrationId - Registration ID
 * @returns {object} Hapi view response
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

/**
 * Renders the validation failures page for invalid summary logs
 * @param {object} h - Hapi response toolkit
 * @param {(key: string, params?: object) => string} localise - i18n localisation function
 * @param {object} context - View context
 * @param {object} context.validation - Validation result containing failures
 * @param {string} context.uploadUrl - URL for re-uploading the file
 * @param {string} context.cancelUrl - URL for cancelling and returning to dashboard
 * @returns {object} Hapi view response
 */
const renderValidationFailuresView = (
  h,
  localise,
  { validation, uploadUrl, cancelUrl }
) => {
  const failures = validation?.failures ?? []

  const fallbackMessage = localise(
    `summary-log:failure.${validationFailureCodes.UNKNOWN}`
  )

  // Data entry codes are grouped into a single user-friendly message
  const issues =
    failures.length > 0
      ? [
          ...new Set(
            failures.map(({ code }) => {
              const displayCode = DATA_ENTRY_CODES.has(code)
                ? DATA_ENTRY_DISPLAY_CODE
                : code
              return localise(`summary-log:failure.${displayCode}`, {
                defaultValue: fallbackMessage
              })
            })
          )
        ]
      : [fallbackMessage]

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
 * @param {object} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {object} context - View context
 * @param {string} context.status - Current summary log status
 * @param {string} context.pollUrl - URL for polling status updates
 * @returns {object} Hapi view response
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
 */
const viewResolvers = {
  [summaryLogStatuses.validated]: renderCheckView,
  [summaryLogStatuses.submitting]: renderSubmittingView,
  [summaryLogStatuses.submitted]: renderSuccessView,
  [summaryLogStatuses.superseded]: renderSupersededView,
  [summaryLogStatuses.invalid]: renderValidationFailuresView,
  [summaryLogStatuses.rejected]: renderValidationFailuresView,
  [summaryLogStatuses.validationFailed]: renderValidationFailuresView
}

/**
 * Renders appropriate view based on status
 * @param {object} options - Rendering options
 * @param {object} options.h - Hapi response toolkit
 * @param {(key: string, params?: object) => string} options.localise - i18n localisation function
 * @param {string} options.status - Backend status
 * @param {object} [options.validation] - Validation object from backend
 * @param {string} [options.accreditationNumber] - Accreditation number for submitted logs
 * @param {object} [options.loads] - Loads data with row IDs for validated summary logs
 * @param {string} options.organisationId - Organisation ID
 * @param {string} options.registrationId - Registration ID
 * @param {string} options.summaryLogId - Summary log ID
 * @param {string} options.pollUrl - URL for polling status
 * @param {string} options.uploadUrl - URL for re-uploading
 * @param {string} options.cancelUrl - URL for cancel button
 * @returns {object} Hapi view response
 */
const renderViewForStatus = (options) => {
  const { h, localise, status } = options
  const resolver = viewResolvers[status] ?? renderProgressView

  return resolver(h, localise, options)
}

/**
 * Gets a pre-signed upload URL and upload ID for re-uploading a summary log
 * @param {string} status - Current summary log status
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @param {string} redirectUrl - URL to redirect to after upload (with {summaryLogId} placeholder)
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<{uploadUrl?: string, uploadId?: string}>} Upload URL and ID, or empty object if not needed
 */
const getUploadData = async (
  status,
  organisationId,
  registrationId,
  redirectUrl,
  idToken
) => {
  if (!REUPLOAD_STATES.has(status)) {
    return {}
  }

  const { uploadUrl, uploadId } = await initiateSummaryLogUpload({
    organisationId,
    registrationId,
    redirectUrl,
    idToken
  })

  return { uploadUrl, uploadId }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadProgressController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId, summaryLogId } = request.params

    const { ok, value: session } = await getUserSession(request)

    if (!ok || !session) {
      return h.redirect('/login')
    }

    const { status, validation, accreditationNumber, loads, processingType } =
      await getStatusData(
        request,
        organisationId,
        registrationId,
        summaryLogId,
        session.idToken
      )

    const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}`
    const pollUrl = `${baseUrl}/summary-logs/${summaryLogId}`
    const redirectUrl = `${baseUrl}/summary-logs/{summaryLogId}`
    const cancelUrl = baseUrl

    const { uploadId, uploadUrl } = await getUploadData(
      status,
      organisationId,
      registrationId,
      redirectUrl,
      session.idToken
    )

    if (uploadId) {
      const summaryLogsSession = request.yar.get(sessionNames.summaryLogs) || {}
      request.yar.set(sessionNames.summaryLogs, {
        ...summaryLogsSession,
        uploadId
      })
    }

    return renderViewForStatus({
      h,
      localise,
      status,
      validation,
      accreditationNumber,
      loads,
      processingType,
      organisationId,
      registrationId,
      summaryLogId,
      pollUrl,
      uploadUrl,
      cancelUrl
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
