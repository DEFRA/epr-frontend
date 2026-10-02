import { summaryLogUploadProgressController } from '#server/summary-log/controller.js'
import {
  summaryLogCsvDownloadController,
  summaryLogCsvDownloadPath
} from '#server/summary-log/csv-download-controller.js'
import {
  summaryLogDownloadController,
  summaryLogDownloadPath
} from '#server/summary-log/download-controller.js'
import { submitSummaryLogController } from '#server/summary-log/submit-controller.js'

export const summaryLog = {
  plugin: {
    name: 'summary-log',
    register(server) {
      server.route([
        {
          ...summaryLogUploadProgressController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}'
        },
        {
          ...submitSummaryLogController,
          method: 'POST',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit'
        },
        {
          ...summaryLogDownloadController,
          method: 'GET',
          path: summaryLogDownloadPath
        },
        {
          ...summaryLogCsvDownloadController,
          method: 'GET',
          path: summaryLogCsvDownloadPath
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
