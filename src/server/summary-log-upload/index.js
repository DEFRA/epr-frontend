import { summaryLogUploadController } from '~/src/server/summary-log-upload/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const summaryLogUpload = {
  plugin: {
    name: 'summary-log-upload',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/upload',
          ...summaryLogUploadController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
