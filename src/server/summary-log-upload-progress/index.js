import { summaryLogUploadProgressController } from '~/src/server/summary-log-upload-progress/controller.js'

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
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-log/{uploadId}/progress',
          ...summaryLogUploadProgressController
        },
        // @todo: remove this route once CDP Uploader is integrated
        {
          method: 'POST',
          path: '/organisations/{organisationId}/registrations/{registrationId}/summary-log/{uploadId}/progress',
          ...summaryLogUploadProgressController
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
