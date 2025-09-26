import { sessionNames } from '~/src/server/common/constants/session-names.js'
import { fetchStatus } from '~/src/server/common/helpers/upload/fetch-status.js'
import { summaryLogStatuses } from '~/src/server/common/constants/statuses.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadProgressController = {
  handler: async (request, h) => {
    try {
      const { organisationId, registrationId, summaryLogId } = request.params
      const summaryLogsSession = request.yar.get(sessionNames.summaryLogs)
      const { uploadId, summaryLogStatus } = summaryLogsSession ?? {}
      let nextSummaryLogStatus = summaryLogStatus

      if (summaryLogStatus === summaryLogStatuses.initiated) {
        const data = await fetchStatus(uploadId)
        const { uploadStatus } = data

        if (uploadStatus === 'ready') {
          nextSummaryLogStatus = summaryLogStatuses.uploaded
          request.yar.set(sessionNames.summaryLogs, {
            ...summaryLogsSession,
            summaryLogStatus: nextSummaryLogStatus
          })
        }
      } else if (summaryLogStatus === summaryLogStatuses.uploaded) {
        nextSummaryLogStatus = summaryLogStatuses.validating
        request.yar.set(sessionNames.summaryLogs, {
          ...summaryLogsSession,
          summaryLogStatus: nextSummaryLogStatus
        })

        // @todo: call epr-backend to initiate validation
      } else if (
        [
          summaryLogStatuses.validationFailed,
          summaryLogStatuses.validationSucceeded
        ].includes(summaryLogStatus)
      ) {
        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/review`
        )
      }

      return h.view('summary-log-upload-progress/index', {
        pageTitle: 'Summary log: upload progress', // @todo use activity/site/material info
        heading: {
          uploading: 'Your file is being uploaded',
          validating: 'Your file is being validated'
        },
        summaryLogStatus: nextSummaryLogStatus
      })
    } catch (err) {
      // @todo: use structured logging
      request.server.log(['error', 'upload-progress'], err)

      return h.view('error/index', {
        pageTitle: 'Summary log: upload error',
        heading: 'Summary log upload error',
        error: `Failed to upload: ${err.message}`
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
