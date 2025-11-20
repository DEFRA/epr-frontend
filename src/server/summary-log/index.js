import { summaryLogUploadProgressController } from '#server/summary-log/controller.js'

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
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
