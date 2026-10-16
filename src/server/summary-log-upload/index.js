import { summaryLogUploadController } from '#server/summary-log-upload/controller.js'

export const summaryLogUpload = {
  plugin: {
    name: 'summary-log-upload',
    register(server) {
      server.route([
        {
          ...summaryLogUploadController,
          method: 'GET',
          path: '/organisations/{organisationNumber}/registrations/{registrationNumber}/summary-logs/upload'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
