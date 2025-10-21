import { StatusCodes } from 'http-status-codes'
import { fetchSummaryLogStatus } from '~/src/server/common/helpers/upload/fetch-summary-log-status.js'
import { backendSummaryLogStatuses } from '~/src/server/common/constants/statuses.js'
import { sessionNames } from '~/src/server/common/constants/session-names.js'

const PROCESSING_STATES = new Set([
  backendSummaryLogStatuses.preprocessing,
  backendSummaryLogStatuses.validating
])

const PAGE_TITLE = 'Summary log: upload progress'
const VIEW_NAME = 'summary-log-upload-progress/index'
const DEFAULT_ERROR_MESSAGE =
  'Something went wrong with your file upload. Please try again.'

/**
 * Determines view data based on backend status
 * @param {string} status - Backend status
 * @param {string} [failureReason] - Error message from backend
 * @returns {{heading: string, message: string, isProcessing: boolean}}
 */
const getViewData = (status, failureReason) => {
  // Processing states - show designed message
  if (PROCESSING_STATES.has(status)) {
    return {
      heading: 'Your file is being uploaded',
      message:
        'Your summary log is being uploaded and automatically validated. This may take a few minutes.',
      isProcessing: true
    }
  }

  // Terminal states - use placeholders until designs finalized
  const placeholders = {
    [backendSummaryLogStatuses.validated]: {
      heading: 'Validation complete',
      message: 'Your file is ready to submit'
    },
    [backendSummaryLogStatuses.submitted]: {
      heading: 'Submission complete',
      message: 'Your waste records have been updated'
    },
    [backendSummaryLogStatuses.rejected]: {
      heading: 'Upload failed',
      message: failureReason || DEFAULT_ERROR_MESSAGE
    },
    [backendSummaryLogStatuses.invalid]: {
      heading: 'Validation failed',
      message: 'Please check your file and try again'
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
    const { organisationId, registrationId, summaryLogId } = request.params
    const pollUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/progress`

    try {
      // Poll backend for status
      const { status, failureReason } = await fetchSummaryLogStatus(
        organisationId,
        registrationId,
        summaryLogId
      )

      // If upload rejected, redirect to upload page with error
      if (status === backendSummaryLogStatuses.rejected) {
        const summaryLogsSession =
          request.yar.get(sessionNames.summaryLogs) || {}

        request.yar.set(sessionNames.summaryLogs, {
          ...summaryLogsSession,
          lastError: failureReason || DEFAULT_ERROR_MESSAGE
        })

        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
        )
      }

      const viewData = getViewData(status, failureReason)

      return h.view(VIEW_NAME, {
        ...viewData,
        pageTitle: PAGE_TITLE,
        shouldPoll: PROCESSING_STATES.has(status),
        pollUrl
      })
    } catch (err) {
      // 404 means summary log not created yet - treat as preprocessing
      if (err.status === StatusCodes.NOT_FOUND) {
        const viewData = getViewData(backendSummaryLogStatuses.preprocessing)

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
        heading: 'Error checking status',
        message: 'Unable to check upload status - please try again later',
        isProcessing: false,
        shouldPoll: false
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
