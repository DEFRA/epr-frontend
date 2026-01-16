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
          ...summaryLogUploadProgressController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}'
        },
        {
          ...submitSummaryLogController,
          method: 'POST',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
