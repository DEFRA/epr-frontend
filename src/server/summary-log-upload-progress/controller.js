import { fetchSummaryLogStatus } from '~/src/server/common/helpers/upload/fetch-summary-log-status.js'
import { backendSummaryLogStatuses } from '~/src/server/common/constants/statuses.js'

const PROCESSING_STATES = [
  backendSummaryLogStatuses.preprocessing,
  backendSummaryLogStatuses.validating
]

/**
 * Determines view data based on backend status
 * @param {string} status - Backend status
 * @param {string} [failureReason] - Error message from backend
 * @returns {{heading: string, message: string, isProcessing: boolean}}
 */
const getViewData = (status, failureReason) => {
  // Processing states - show designed message
  if (PROCESSING_STATES.includes(status)) {
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
      message:
        failureReason ||
        'Something went wrong with your file upload. Please try again.'
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
    try {
      const { organisationId, registrationId, summaryLogId } = request.params

      // Poll backend for status
      const { status, failureReason } = await fetchSummaryLogStatus(
        organisationId,
        registrationId,
        summaryLogId
      )

      const viewData = getViewData(status, failureReason)

      return h.view('summary-log-upload-progress/index', {
        pageTitle: 'Summary log: upload progress',
        ...viewData,
        shouldPoll: PROCESSING_STATES.includes(status),
        pollUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/progress`
      })
    } catch (err) {
      request.server.log(['error', 'upload-progress'], err)

      return h.view('summary-log-upload-progress/index', {
        pageTitle: 'Summary log: upload progress',
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
