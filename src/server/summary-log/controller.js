import { StatusCodes } from 'http-status-codes'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { backendSummaryLogStatuses } from '#server/common/constants/statuses.js'
import { sessionNames } from '#server/common/constants/session-names.js'

const PROCESSING_STATES = new Set([
  backendSummaryLogStatuses.preprocessing,
  backendSummaryLogStatuses.validating
])

const VIEW_NAME = 'summary-log/progress'
const CHECK_VIEW_NAME = 'summary-log/check'
const SUCCESS_VIEW_NAME = 'summary-log/success'

/**
 * Determines view data based on backend status
 * @param {(key: string) => string} localise - The i18n translation function
 * @param {string} status - Backend status
 * @param {string} [failureReason] - Error message from backend
 * @returns {{heading: string, message: string, isProcessing: boolean}}
 */
const getViewData = (localise, status, failureReason) => {
  // Processing states - show designed message
  if (PROCESSING_STATES.has(status)) {
    return {
      heading: localise('summary-log:processingHeading'),
      message: localise('summary-log:processingMessage'),
      isProcessing: true
    }
  }

  // Terminal states
  const placeholders = {
    [backendSummaryLogStatuses.validated]: {
      heading: localise('summary-log:validatedHeading'),
      message: localise('summary-log:validatedMessage')
    },
    [backendSummaryLogStatuses.submitted]: {
      heading: localise('summary-log:submittedHeading'),
      message: localise('summary-log:submittedMessage')
    },
    [backendSummaryLogStatuses.rejected]: {
      heading: localise('summary-log:invalidHeading'),
      message: failureReason || localise('summary-log:rejectedDefaultReason')
    },
    [backendSummaryLogStatuses.invalid]: {
      heading: localise('summary-log:invalidHeading'),
      message: failureReason || localise('summary-log:invalidMessage')
    }
  }

  return {
    ...placeholders[status],
    isProcessing: false
  }
}

/**
 * Gets status data from session (if fresh) or backend API
 * @param {object} request - Hapi request object
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @param {string} summaryLogId - Summary log ID
 * @returns {Promise<{status: string, failureReason?: string, accreditationNumber?: string}>}
 */
const getStatusData = async (
  request,
  organisationId,
  registrationId,
  summaryLogId
) => {
  // Check session for fresh data first (prevents race condition after POST submit)
  const summaryLogsSession = request.yar.get(sessionNames.summaryLogs) || {}
  const freshData = summaryLogsSession.freshData

  if (freshData) {
    // Use fresh data from session and clear it
    const { status, accreditationNumber, failureReason } = freshData

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { freshData: _, ...remainingSession } = summaryLogsSession
    request.yar.set(sessionNames.summaryLogs, remainingSession)

    return { status, accreditationNumber, failureReason }
  }

  // Poll backend for status
  const response = await fetchSummaryLogStatus(
    organisationId,
    registrationId,
    summaryLogId
  )
  return {
    status: response.status,
    failureReason: response.failureReason,
    accreditationNumber: response.accreditationNumber
  }
}

/**
 * Handles rejected status by storing error in session and redirecting
 * @param {object} request - Hapi request object
 * @param {object} h - Hapi response toolkit
 * @param {Function} localise - i18n localisation function
 * @param {string} failureReason - Failure reason from backend
 * @param {string} organisationId - Organisation ID
 * @param {string} registrationId - Registration ID
 * @returns {object} Hapi redirect response
 */
const handleRejectedStatus = (
  request,
  h,
  localise,
  failureReason,
  organisationId,
  registrationId
) => {
  const currentSession = request.yar.get(sessionNames.summaryLogs) || {}

  request.yar.set(sessionNames.summaryLogs, {
    ...currentSession,
    lastError: failureReason || localise('summary-log:rejectedDefaultReason')
  })

  return h.redirect(
    `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
  )
}

/**
 * Renders appropriate view based on status
 * @param {object} options - Rendering options
 * @param {object} options.h - Hapi response toolkit
 * @param {object} options.localise - i18n localisation function
 * @param {string} options.status - Backend status
 * @param {string} [options.failureReason] - Failure reason from backend
 * @param {string} [options.accreditationNumber] - Accreditation number for submitted logs
 * @param {string} options.organisationId - Organisation ID
 * @param {string} options.registrationId - Registration ID
 * @param {string} options.pollUrl - URL for polling status
 * @returns {object} Hapi view response
 */
const renderViewForStatus = ({
  h,
  localise,
  status,
  failureReason,
  accreditationNumber,
  organisationId,
  registrationId,
  pollUrl
}) => {
  const PAGE_TITLE = localise('summary-log:pageTitle')

  // If validated, show check page
  if (status === backendSummaryLogStatuses.validated) {
    return h.view(CHECK_VIEW_NAME, {
      pageTitle: localise('summary-log:checkPageTitle'),
      organisationId,
      registrationId
    })
  }

  // If submitted, show success page
  if (status === backendSummaryLogStatuses.submitted) {
    return h.view(SUCCESS_VIEW_NAME, {
      pageTitle: localise('summary-log:successPageTitle'),
      organisationId,
      registrationId,
      accreditationNumber
    })
  }

  // Show progress page for all other statuses
  const viewData = getViewData(localise, status, failureReason)

  return h.view(VIEW_NAME, {
    ...viewData,
    pageTitle: PAGE_TITLE,
    shouldPoll: PROCESSING_STATES.has(status),
    pollUrl
  })
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadProgressController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId, summaryLogId } = request.params
    const pollUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const PAGE_TITLE = localise('summary-log:pageTitle')

    try {
      const { status, failureReason, accreditationNumber } =
        await getStatusData(
          request,
          organisationId,
          registrationId,
          summaryLogId
        )

      // If upload rejected, redirect back to upload page with error
      if (status === backendSummaryLogStatuses.rejected) {
        return handleRejectedStatus(
          request,
          h,
          localise,
          failureReason,
          organisationId,
          registrationId
        )
      }

      // Render appropriate view based on status
      return renderViewForStatus({
        h,
        localise,
        status,
        failureReason,
        accreditationNumber,
        organisationId,
        registrationId,
        pollUrl
      })
    } catch (err) {
      // 404 means summary log not created yet - treat as preprocessing
      if (err.status === StatusCodes.NOT_FOUND) {
        const viewData = getViewData(
          localise,
          backendSummaryLogStatuses.preprocessing
        )

        return h.view(VIEW_NAME, {
          ...viewData,
          pageTitle: PAGE_TITLE,
          shouldPoll: true,
          pollUrl
        })
      }

      // Other errors - show error page
      request.server.log(['error', 'upload-progress'], err)

      return h.view(VIEW_NAME, {
        pageTitle: PAGE_TITLE,
        heading: localise('summary-log:errorHeading'),
        message: localise('summary-log:errorMessage'),
        isProcessing: false,
        shouldPoll: false
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
