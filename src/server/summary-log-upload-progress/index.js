import { summaryLogUploadProgressController } from '#server/summary-log-upload-progress/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const summaryLogUploadProgress = {
  plugin: {
    name: 'summary-log-upload-progress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/progress',
          ...summaryLogUploadProgressController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
