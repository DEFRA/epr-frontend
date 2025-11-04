import { StatusCodes } from 'http-status-codes'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { backendSummaryLogStatuses } from '#server/common/constants/statuses.js'
import { sessionNames } from '#server/common/constants/session-names.js'

const PROCESSING_STATES = new Set([
  backendSummaryLogStatuses.preprocessing,
  backendSummaryLogStatuses.validating
])

const VIEW_NAME = 'summary-log-upload-progress/index'

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
      heading: localise('summary-log-upload-progress:processingHeading'),
      message: localise('summary-log-upload-progress:processingMessage'),
      isProcessing: true
    }
  }

  // Terminal states
  const placeholders = {
    [backendSummaryLogStatuses.validated]: {
      heading: localise('summary-log-upload-progress:validatedHeading'),
      message: localise('summary-log-upload-progress:validatedMessage')
    },
    [backendSummaryLogStatuses.submitted]: {
      heading: localise('summary-log-upload-progress:submittedHeading'),
      message: localise('summary-log-upload-progress:submittedMessage')
    },
    [backendSummaryLogStatuses.rejected]: {
      heading: localise('summary-log-upload-progress:invalidHeading'),
      message:
        failureReason ||
        localise('summary-log-upload-progress:rejectedDefaultReason')
    },
    [backendSummaryLogStatuses.invalid]: {
      heading: localise('summary-log-upload-progress:invalidHeading'),
      message:
        failureReason || localise('summary-log-upload-progress:invalidMessage')
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
    const pollUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/progress`
    const PAGE_TITLE = localise('summary-log-upload-progress:pageTitle')

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
            failureReason ||
            localise('summary-log-upload-progress:rejectedDefaultReason')
        })

        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
        )
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
        heading: localise('summary-log-upload-progress:errorHeading'),
        message: localise('summary-log-upload-progress:errorMessage'),
        isProcessing: false,
        shouldPoll: false
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
