import { summaryLogUploadController } from '#server/summary-log-upload/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const summaryLogUpload = {
  plugin: {
    name: 'summary-log-upload',
    register(server) {
      server.route([
        {
          ...summaryLogUploadController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/upload'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
