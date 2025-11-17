import { summaryLogUploadProgressController } from '#server/summary-log/controller.js'
import { submitSummaryLogController } from '#server/summary-log/submit-controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const summaryLog = {
  plugin: {
    name: 'summary-log',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}',
          ...summaryLogUploadProgressController
        },
        {
          method: 'POST',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit',
          ...submitSummaryLogController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
