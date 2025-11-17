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
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadProgressController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId, summaryLogId } = request.params
    const pollUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    const PAGE_TITLE = localise('summary-log:pageTitle')

    try {
      // Poll backend for status
      const { status, failureReason } = await fetchSummaryLogStatus(
        organisationId,
        registrationId,
        summaryLogId
      )

      // If upload rejected, redirect back to upload page with error
      if (status === backendSummaryLogStatuses.rejected) {
        const summaryLogsSession =
          request.yar.get(sessionNames.summaryLogs) || {}

        request.yar.set(sessionNames.summaryLogs, {
          ...summaryLogsSession,
          lastError:
            failureReason || localise('summary-log:rejectedDefaultReason')
        })

        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
        )
      }

      // If validated or submitted, show check page
      if (
        status === backendSummaryLogStatuses.validated ||
        status === backendSummaryLogStatuses.submitted
      ) {
        return h.view(CHECK_VIEW_NAME, {
          pageTitle: localise('summary-log:checkPageTitle'),
          heading: localise('summary-log:checkHeading')
        })
      }

      const viewData = getViewData(localise, status, failureReason)

      return h.view(VIEW_NAME, {
        ...viewData,
        pageTitle: PAGE_TITLE,
        shouldPoll: PROCESSING_STATES.has(status),
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
